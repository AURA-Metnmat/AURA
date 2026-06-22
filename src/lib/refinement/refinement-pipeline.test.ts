import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeQualityScore,
  findDuplicateAnswerId,
  detectContradictions,
  refineAnswer,
  jaccardSimilarity,
} from "@/lib/refinement/refinement-pipeline";
import { REVIEW_STATUS } from "@/lib/knowledge/review";

const base = (overrides: Partial<Parameters<typeof refineAnswer>[0]>) => ({
  id: "a1",
  rawText: "We use SAP for inventory daily with three approvers",
  interactionType: "free_text",
  structuredJson: null,
  section: "B",
  createdAt: new Date(),
  ...overrides,
});

describe("refinement pipeline", () => {
  it("scores structured answers higher than generic text", () => {
    const structured = computeQualityScore(
      base({
        interactionType: "mcq",
        structuredJson: JSON.stringify({ optionId: "a", value: "a" }),
        rawText: "2–5 years",
      })
    );
    const generic = computeQualityScore(base({ rawText: "yes" }));
    assert.ok(structured > generic);
  });

  it("detects near-duplicate answers", () => {
    const prior = base({ id: "p1", rawText: "We use SAP for inventory daily with three approvers" });
    const dup = findDuplicateAnswerId(
      base({ id: "a2", rawText: "We use SAP for inventory daily with three approvers." }),
      [prior]
    );
    assert.equal(dup, "p1");
  });

  it("flags opposite yes/no in same section", () => {
    const prior = base({
      id: "p1",
      interactionType: "yes_no",
      structuredJson: JSON.stringify({ value: true }),
      section: "D",
    });
    const flags = detectContradictions(
      base({
        id: "a2",
        interactionType: "yes_no",
        structuredJson: JSON.stringify({ value: false }),
        section: "D",
        rawText: "No",
      }),
      [prior]
    );
    assert.equal(flags[0]?.type, "opposite_yes_no");
  });

  it("marks low-confidence duplicates as needs attention", () => {
    const prior = base({ id: "p1" });
    const result = refineAnswer(
      base({ id: "a2", rawText: "We use SAP for inventory daily with three approvers" }),
      [prior]
    );
    assert.equal(result.reviewStatus, REVIEW_STATUS.NEEDS_ATTENTION);
    assert.ok(result.duplicateOfId);
  });

  it("computes jaccard similarity", () => {
    assert.ok(jaccardSimilarity("hello world foo", "hello world bar") > 0.3);
    assert.ok(jaccardSimilarity("abc", "xyz") < 0.2);
  });
});
