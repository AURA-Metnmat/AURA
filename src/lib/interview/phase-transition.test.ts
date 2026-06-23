import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPhaseConfig, INTERVIEW_PHASE } from "./phase-config";
import {
  getPhaseProgress,
  shouldTransitionToPhase2,
} from "./phase-transition";

const baseConfig = buildPhaseConfig({
  phase1DurationMinutes: 8,
  phase2DurationMinutes: 7,
  phase2Enabled: true,
});

describe("phase-transition", () => {
  it("counts down phase 1 remaining while in phase1_ai", () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    const now = new Date("2026-01-01T10:04:00Z");
    const progress = getPhaseProgress({
      interviewPhase: INTERVIEW_PHASE.PHASE1_AI,
      phase1StartedAt: startedAt,
      phase2StartedAt: null,
      startedAt,
      config: baseConfig,
      now,
    });
    assert.equal(progress.phase1RemainingSeconds, 4 * 60);
    assert.equal(progress.phase2RemainingSeconds, null);
  });

  it("tracks phase 2 remaining after transition", () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    const phase2StartedAt = new Date("2026-01-01T10:08:00Z");
    const now = new Date("2026-01-01T10:10:00Z");
    const progress = getPhaseProgress({
      interviewPhase: INTERVIEW_PHASE.PHASE2_FIXED,
      phase1StartedAt: startedAt,
      phase2StartedAt,
      startedAt,
      config: baseConfig,
      now,
    });
    assert.equal(progress.phase1RemainingSeconds, null);
    assert.equal(progress.phase2RemainingSeconds, 5 * 60);
  });

  it("does not transition before intro is complete", () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    const now = new Date("2026-01-01T10:30:00Z");
    assert.equal(
      shouldTransitionToPhase2({
        interviewPhase: INTERVIEW_PHASE.PHASE1_AI,
        phase1StartedAt: startedAt,
        startedAt,
        config: baseConfig,
        phase2QuestionCount: 3,
        introStep: 2,
        now,
      }),
      false
    );
  });

  it("transitions when phase 1 timer elapses and questions exist", () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    const phase1StartedAt = new Date("2026-01-01T10:00:00Z");
    const now = new Date("2026-01-01T10:08:01Z");
    assert.equal(
      shouldTransitionToPhase2({
        interviewPhase: INTERVIEW_PHASE.PHASE1_AI,
        phase1StartedAt,
        startedAt,
        config: baseConfig,
        phase2QuestionCount: 3,
        introStep: 3,
        now,
      }),
      true
    );
  });

  it("does not transition when phase 2 disabled or has no questions", () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    const now = new Date("2026-01-01T10:30:00Z");
    const disabled = buildPhaseConfig({ phase2Enabled: false });
    assert.equal(
      shouldTransitionToPhase2({
        interviewPhase: INTERVIEW_PHASE.PHASE1_AI,
        phase1StartedAt: startedAt,
        startedAt,
        config: disabled,
        phase2QuestionCount: 3,
        introStep: 3,
        now,
      }),
      false
    );
    assert.equal(
      shouldTransitionToPhase2({
        interviewPhase: INTERVIEW_PHASE.PHASE1_AI,
        phase1StartedAt: startedAt,
        startedAt,
        config: baseConfig,
        phase2QuestionCount: 0,
        introStep: 3,
        now,
      }),
      false
    );
  });
});
