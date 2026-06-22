import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildFunnelCounts } from "@/lib/analytics/interview-funnel";
import {
  computeQualityScore,
  deriveReviewStatus,
  refineAnswer,
  type AnswerForRefinement,
} from "@/lib/refinement/refinement-pipeline";
import { REVIEW_STATUS } from "@/lib/knowledge/review";

function answer(
  overrides: Partial<AnswerForRefinement> & Pick<AnswerForRefinement, "id" | "rawText">
): AnswerForRefinement {
  return {
    interactionType: "text",
    structuredJson: null,
    section: "operations",
    createdAt: new Date("2026-06-01"),
    ...overrides,
  };
}

describe("interview data pipeline integration", () => {
  it("refines structured answers with higher quality than generic text", () => {
    const structured = answer({
      id: "a1",
      rawText: "We run a 3-shift rolling schedule with 45-minute handovers.",
      interactionType: "text",
      structuredJson: JSON.stringify({ value: "3-shift rolling" }),
    });
    const generic = answer({
      id: "a2",
      rawText: "yes",
      interactionType: "yes_no",
      structuredJson: JSON.stringify({ value: true }),
    });

    const structuredResult = refineAnswer(structured, []);
    const genericResult = refineAnswer(generic, []);

    assert.ok(structuredResult.qualityScore > genericResult.qualityScore);
    assert.ok(structuredResult.confidenceScore >= genericResult.confidenceScore);
  });

  it("flags contradictory yes/no answers in the same section", () => {
    const yes = answer({
      id: "a1",
      rawText: "Yes we always preheat the furnace before loading.",
      interactionType: "yes_no",
      structuredJson: JSON.stringify({ value: true }),
      section: "operations",
    });
    const no = answer({
      id: "a2",
      rawText: "No we never preheat the furnace before loading.",
      interactionType: "yes_no",
      structuredJson: JSON.stringify({ value: false }),
      section: "operations",
    });

    const result = refineAnswer(no, [yes]);
    assert.ok(result.contradictionFlags.length > 0);
    assert.equal(result.reviewStatus, REVIEW_STATUS.NEEDS_ATTENTION);
  });

  it("aligns funnel completion with refined session outcomes", () => {
    const sessions = [
      {
        status: "active",
        completionPct: 40,
        consentAcceptedAt: new Date("2026-06-01"),
        introStep: 2,
        messageCount: 8,
        startedAt: new Date("2026-06-01"),
        completedAt: null,
      },
      {
        status: "completed",
        completionPct: 100,
        consentAcceptedAt: new Date("2026-06-01"),
        introStep: 4,
        messageCount: 24,
        startedAt: new Date("2026-06-01"),
        completedAt: new Date("2026-06-01T02:00:00"),
      },
    ];

    const counts = buildFunnelCounts(sessions);
    assert.equal(counts.started, 2);
    assert.equal(counts.completed, 1);

    const structured = answer({
      id: "done-1",
      rawText: "Completed operators document SOP deviations in the daily logbook.",
      structuredJson: JSON.stringify({ value: "daily logbook" }),
    });
    const refined = refineAnswer(structured, []);
    const review = deriveReviewStatus(
      refined.confidenceScore,
      refined.duplicateOfId,
      refined.contradictionFlags
    );
    assert.equal(review, REVIEW_STATUS.PENDING);
  });
});
