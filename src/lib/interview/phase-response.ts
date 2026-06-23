import { buildPhaseConfig, INTERVIEW_PHASE } from "./phase-config";
import { getPhaseProgress } from "./phase-transition";
import { countActivePhase2Questions } from "./phase2-runner";

export interface InterviewPhaseMeta {
  interviewPhase: string;
  phase1Title: string;
  phase2Title: string;
  phase2Enabled: boolean;
  phaseProgress: ReturnType<typeof getPhaseProgress>;
  phase2QuestionNumber?: number;
  phase2QuestionTotal?: number;
}

export async function buildInterviewPhaseMeta(params: {
  companyId: string;
  company: {
    phase1DurationMinutes?: number | null;
    phase2DurationMinutes?: number | null;
    phase2Enabled?: boolean | null;
    phase1Title?: string | null;
    phase2Title?: string | null;
    interviewDurationMinutes?: number | null;
  };
  interviewPhase: string;
  phase2QuestionIndex: number;
  phase1StartedAt: Date | null;
  phase2StartedAt: Date | null;
  startedAt: Date;
  phase2QuestionCount?: number;
}): Promise<InterviewPhaseMeta> {
  const config = buildPhaseConfig(params.company);
  const phase2QuestionCount =
    params.phase2QuestionCount ?? (await countActivePhase2Questions(params.companyId));

  const meta: InterviewPhaseMeta = {
    interviewPhase: params.interviewPhase,
    phase1Title: config.phase1Title,
    phase2Title: config.phase2Title,
    phase2Enabled: config.phase2Enabled,
    phaseProgress: getPhaseProgress({
      interviewPhase: params.interviewPhase,
      phase1StartedAt: params.phase1StartedAt,
      phase2StartedAt: params.phase2StartedAt,
      startedAt: params.startedAt,
      config,
    }),
  };

  if (
    params.interviewPhase === INTERVIEW_PHASE.PHASE2_FIXED &&
    phase2QuestionCount > 0
  ) {
    meta.phase2QuestionNumber = params.phase2QuestionIndex + 1;
    meta.phase2QuestionTotal = phase2QuestionCount;
  }

  return meta;
}
