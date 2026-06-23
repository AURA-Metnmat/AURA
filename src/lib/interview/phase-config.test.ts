import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPhaseConfig, parsePhaseConfigUpdate, clampPhaseMinutes, hasPendingPhase2, isPhase2InterviewComplete, PHASE2_FINISHED_COMPLETION_PCT, INTERVIEW_COMPLETE_MIN_PCT } from "./phase-config";

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

  it("detects pending phase 2", () => {
    const config = buildPhaseConfig({ phase2Enabled: true });
    assert.equal(hasPendingPhase2(config, 5), true);
    assert.equal(hasPendingPhase2(config, 0), false);
    assert.equal(hasPendingPhase2(buildPhaseConfig({ phase2Enabled: false }), 5), false);
  });

  it("detects phase 2 interview complete", () => {
    assert.equal(
      isPhase2InterviewComplete({
        interviewPhase: "phase2_fixed",
        phase2QuestionIndex: 4,
        phase2QuestionCount: 5,
      }),
      true
    );
    assert.equal(
      isPhase2InterviewComplete({
        interviewPhase: "phase1_ai",
        phase2QuestionIndex: 4,
        phase2QuestionCount: 5,
      }),
      false
    );
  });

  it("exports completion thresholds", () => {
    assert.equal(INTERVIEW_COMPLETE_MIN_PCT, 60);
    assert.equal(PHASE2_FINISHED_COMPLETION_PCT, 100);
  });
});
