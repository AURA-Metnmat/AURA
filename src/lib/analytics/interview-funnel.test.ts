import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildFunnelCounts,
  buildFunnelDropOff,
  sessionReachedStage,
} from "./interview-funnel";

describe("interview funnel", () => {
  it("tracks cumulative funnel stages", () => {
    const sessions = [
      {
        status: "active",
        completionPct: 0,
        consentAcceptedAt: null,
        introStep: 1,
        messageCount: 0,
        startedAt: new Date("2026-01-01"),
        completedAt: null,
      },
      {
        status: "active",
        completionPct: 10,
        consentAcceptedAt: new Date("2026-01-01"),
        introStep: 2,
        messageCount: 5,
        startedAt: new Date("2026-01-01"),
        completedAt: null,
      },
      {
        status: "completed",
        completionPct: 100,
        consentAcceptedAt: new Date("2026-01-01"),
        introStep: 3,
        messageCount: 20,
        startedAt: new Date("2026-01-01"),
        completedAt: new Date("2026-01-01T01:00:00"),
      },
    ];

    const counts = buildFunnelCounts(sessions);
    assert.equal(counts.started, 3);
    assert.equal(counts.consent, 2);
    assert.equal(counts.past_intro, 2);
    assert.equal(counts.completed, 1);

    const dropOff = buildFunnelDropOff(counts);
    assert.equal(dropOff[0]?.dropOff, 1);
    assert.equal(dropOff[2]?.dropOff, 1);
  });

  it("counts completed even without consent timestamp", () => {
    assert.equal(
      sessionReachedStage(
        {
          status: "completed",
          completionPct: 100,
          consentAcceptedAt: null,
          introStep: 1,
          messageCount: 1,
          startedAt: new Date(),
          completedAt: new Date(),
        },
        "consent"
      ),
      true
    );
  });
});
