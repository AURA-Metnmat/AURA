import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPhaseConfig, parsePhaseConfigUpdate, clampPhaseMinutes } from "./phase-config";

describe("phase-config", () => {
  it("builds total duration from both phases when phase2 enabled", () => {
    const config = buildPhaseConfig({
      phase1DurationMinutes: 10,
      phase2DurationMinutes: 5,
      phase2Enabled: true,
    });
    assert.equal(config.totalDurationMinutes, 15);
    assert.equal(config.phase1Title, "AI Discovery");
  });

  it("excludes phase2 duration when disabled", () => {
    const config = buildPhaseConfig({
      phase1DurationMinutes: 10,
      phase2DurationMinutes: 5,
      phase2Enabled: false,
    });
    assert.equal(config.totalDurationMinutes, 10);
  });

  it("parsePhaseConfigUpdate syncs interviewDurationMinutes", () => {
    const update = parsePhaseConfigUpdate({
      phase1DurationMinutes: 12,
      phase2DurationMinutes: 8,
      phase2Enabled: true,
    });
    assert.equal(update.interviewDurationMinutes, 20);
  });

  it("clamps phase minutes", () => {
    assert.equal(clampPhaseMinutes(0), 1);
    assert.equal(clampPhaseMinutes(200), 120);
  });
});
