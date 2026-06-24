export const INTERVIEW_PHASE = {
  PHASE1_AI: "phase1_ai",
  /** Phase 1 time ended — celebration shown; MCQ not started yet. */
  PHASE1_COMPLETE: "phase1_complete",
  PHASE2_FIXED: "phase2_fixed",
} as const;

export type InterviewPhase = (typeof INTERVIEW_PHASE)[keyof typeof INTERVIEW_PHASE];

export interface CompanyPhaseConfig {
  phase1DurationMinutes: number;
  phase2DurationMinutes: number;
  phase2Enabled: boolean;
  phase1Title: string;
  phase2Title: string;
  totalDurationMinutes: number;
}

/** Minimum completion % required to finish via the complete API (Phase 1 path). */
export const INTERVIEW_COMPLETE_MIN_PCT = 60;

/** Completion % set when all Phase 2 fixed questions are answered. */
export const PHASE2_FINISHED_COMPLETION_PCT = 100;

const MIN_PHASE_MINUTES = 1;
const MAX_PHASE_MINUTES = 120;

export function clampPhaseMinutes(value: number): number {
  if (!Number.isFinite(value)) return MIN_PHASE_MINUTES;
  return Math.min(MAX_PHASE_MINUTES, Math.max(MIN_PHASE_MINUTES, Math.round(value)));
}

export function buildPhaseConfig(company: {
  phase1DurationMinutes?: number | null;
  phase2DurationMinutes?: number | null;
  phase2Enabled?: boolean | null;
  phase1Title?: string | null;
  phase2Title?: string | null;
  interviewDurationMinutes?: number | null;
}): CompanyPhaseConfig {
  const phase1DurationMinutes = clampPhaseMinutes(company.phase1DurationMinutes ?? 8);
  const phase2DurationMinutes = clampPhaseMinutes(company.phase2DurationMinutes ?? 7);
  const phase2Enabled = company.phase2Enabled !== false;
  const phase1Title = company.phase1Title?.trim() || "AI Discovery";
  const phase2Title = company.phase2Title?.trim() || "Domain Questions";
  const totalDurationMinutes =
    phase1DurationMinutes + (phase2Enabled ? phase2DurationMinutes : 0);

  return {
    phase1DurationMinutes,
    phase2DurationMinutes,
    phase2Enabled,
    phase1Title,
    phase2Title,
    totalDurationMinutes:
      totalDurationMinutes > 0
        ? totalDurationMinutes
        : company.interviewDurationMinutes ?? 15,
  };
}

export function hasPendingPhase2(
  config: CompanyPhaseConfig,
  phase2QuestionCount: number
): boolean {
  return config.phase2Enabled && phase2QuestionCount > 0;
}

export function isPhase2InterviewComplete(params: {
  interviewPhase: string;
  phase2QuestionIndex: number;
  phase2QuestionCount: number;
}): boolean {
  if (params.interviewPhase !== INTERVIEW_PHASE.PHASE2_FIXED) return false;
  if (params.phase2QuestionCount <= 0) return false;
  return params.phase2QuestionIndex + 1 >= params.phase2QuestionCount;
}

export function parsePhaseConfigUpdate(body: Record<string, unknown>): Partial<{
  phase1DurationMinutes: number;
  phase2DurationMinutes: number;
  phase2Enabled: boolean;
  phase1Title: string;
  phase2Title: string;
  interviewDurationMinutes: number;
}> {
  const out: ReturnType<typeof parsePhaseConfigUpdate> = {};

  if (body.phase1DurationMinutes !== undefined) {
    out.phase1DurationMinutes = clampPhaseMinutes(Number(body.phase1DurationMinutes));
  }
  if (body.phase2DurationMinutes !== undefined) {
    out.phase2DurationMinutes = clampPhaseMinutes(Number(body.phase2DurationMinutes));
  }
  if (body.phase2Enabled !== undefined) {
    out.phase2Enabled = Boolean(body.phase2Enabled);
  }
  if (typeof body.phase1Title === "string") {
    out.phase1Title = body.phase1Title.trim().slice(0, 80) || "AI Discovery";
  }
  if (typeof body.phase2Title === "string") {
    out.phase2Title = body.phase2Title.trim().slice(0, 80) || "Domain Questions";
  }

  if (
    out.phase1DurationMinutes !== undefined ||
    out.phase2DurationMinutes !== undefined ||
    out.phase2Enabled !== undefined
  ) {
    const phase1 = out.phase1DurationMinutes ?? 8;
    const phase2Enabled = out.phase2Enabled ?? true;
    const phase2 = phase2Enabled ? (out.phase2DurationMinutes ?? 7) : 0;
    out.interviewDurationMinutes = phase1 + phase2;
  }

  return out;
}
