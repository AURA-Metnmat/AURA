export const FUNNEL_STAGE_ORDER = [
  "started",
  "consent",
  "past_intro",
  "mid_interview",
  "near_complete",
  "completed",
] as const;

export type FunnelStageId = (typeof FUNNEL_STAGE_ORDER)[number];

export const FUNNEL_STAGE_LABELS: Record<FunnelStageId, string> = {
  started: "Started",
  consent: "Consent given",
  past_intro: "Past intro",
  mid_interview: "25%+ progress",
  near_complete: "75%+ progress",
  completed: "Completed",
};

export interface SessionFunnelInput {
  status: string;
  completionPct: number;
  consentAcceptedAt: Date | null;
  introStep: number;
  messageCount: number;
  startedAt: Date;
  completedAt: Date | null;
}

export function sessionReachedStage(
  session: SessionFunnelInput,
  stage: FunnelStageId
): boolean {
  const completed = session.status === "completed";

  switch (stage) {
    case "started":
      return true;
    case "consent":
      return session.consentAcceptedAt != null || completed;
    case "past_intro":
      return (
        (session.consentAcceptedAt != null &&
          (session.introStep > 1 ||
            session.completionPct >= 5 ||
            session.messageCount >= 4)) ||
        completed
      );
    case "mid_interview":
      return session.completionPct >= 25 || completed;
    case "near_complete":
      return session.completionPct >= 75 || completed;
    case "completed":
      return completed;
    default: {
      const _exhaustive: never = stage;
      return _exhaustive;
    }
  }
}

export function buildFunnelCounts(sessions: SessionFunnelInput[]): Record<FunnelStageId, number> {
  const counts = Object.fromEntries(
    FUNNEL_STAGE_ORDER.map((stage) => [stage, 0])
  ) as Record<FunnelStageId, number>;

  for (const session of sessions) {
    for (const stage of FUNNEL_STAGE_ORDER) {
      if (sessionReachedStage(session, stage)) {
        counts[stage] += 1;
      }
    }
  }

  return counts;
}

export function buildFunnelDropOff(counts: Record<FunnelStageId, number>): {
  stage: FunnelStageId;
  label: string;
  count: number;
  dropOff: number;
  dropOffPct: number | null;
}[] {
  return FUNNEL_STAGE_ORDER.map((stage, index) => {
    const count = counts[stage];
    const nextStage = FUNNEL_STAGE_ORDER[index + 1];
    const nextCount = nextStage ? counts[nextStage] : count;
    const dropOff = nextStage ? Math.max(0, count - nextCount) : 0;
    const dropOffPct = count > 0 && nextStage ? Math.round((dropOff / count) * 1000) / 10 : null;

    return {
      stage,
      label: FUNNEL_STAGE_LABELS[stage],
      count,
      dropOff,
      dropOffPct,
    };
  });
}

export function averageCompletionMinutes(
  sessions: SessionFunnelInput[]
): number | null {
  const durations = sessions
    .filter((s) => s.status === "completed" && s.completedAt)
    .map((s) => (s.completedAt!.getTime() - s.startedAt.getTime()) / 60_000);

  if (durations.length === 0) return null;
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  return Math.round(avg * 10) / 10;
}
