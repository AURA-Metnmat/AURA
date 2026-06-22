import { db } from "@/lib/db";
import {
  averageCompletionMinutes,
  buildFunnelCounts,
  buildFunnelDropOff,
  FUNNEL_STAGE_LABELS,
  FUNNEL_STAGE_ORDER,
  type SessionFunnelInput,
} from "@/lib/analytics/interview-funnel";

export interface CompanyInterviewAnalytics {
  totals: {
    sessions: number;
    active: number;
    completed: number;
    completionRate: number | null;
    abandonmentRate: number | null;
    avgCompletionMinutes: number | null;
    avgProgressPct: number | null;
  };
  funnel: {
    stage: string;
    label: string;
    count: number;
    dropOff: number;
    dropOffPct: number | null;
    conversionPct: number | null;
  }[];
  byCampaign: {
    campaignId: string | null;
    campaignName: string;
    sessions: number;
    completed: number;
    completionRate: number | null;
    avgProgressPct: number | null;
  }[];
  byDepartment: {
    department: string;
    sessions: number;
    completed: number;
    completionRate: number | null;
  }[];
  recentAbandoned: {
    sessionId: string;
    participant: string | null;
    completionPct: number;
    lastActiveAt: string;
    campaignName: string | null;
  }[];
}

function toFunnelInput(session: {
  status: string;
  completionPct: number;
  consentAcceptedAt: Date | null;
  introStep: number;
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
  _count: { messages: number };
}): SessionFunnelInput {
  return {
    status: session.status,
    completionPct: session.completionPct,
    consentAcceptedAt: session.consentAcceptedAt,
    introStep: session.introStep,
    messageCount: session._count.messages,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
  };
}

export async function getCompanyInterviewAnalytics(
  companyId: string
): Promise<CompanyInterviewAnalytics> {
  const sessions = await db.interviewSession.findMany({
    where: { companyId },
    select: {
      id: true,
      status: true,
      completionPct: true,
      consentAcceptedAt: true,
      introStep: true,
      startedAt: true,
      completedAt: true,
      updatedAt: true,
      campaignId: true,
      campaign: { select: { name: true } },
      participant: { select: { fullName: true, department: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const inputs = sessions.map(toFunnelInput);
  const counts = buildFunnelCounts(inputs);
  const started = counts.started;
  const completed = counts.completed;

  const funnel = buildFunnelDropOff(counts).map((row) => ({
    ...row,
    conversionPct:
      started > 0 ? Math.round((row.count / started) * 1000) / 10 : null,
  }));

  const active = sessions.filter((s) => s.status !== "completed").length;
  const progressSum = sessions.reduce((n, s) => n + s.completionPct, 0);

  const campaignMap = new Map<
    string,
    { name: string; sessions: number; completed: number; progressSum: number }
  >();

  for (const s of sessions) {
    const key = s.campaignId ?? "none";
    const name = s.campaign?.name ?? "Default / no campaign";
    const entry = campaignMap.get(key) ?? {
      name,
      sessions: 0,
      completed: 0,
      progressSum: 0,
    };
    entry.sessions += 1;
    entry.progressSum += s.completionPct;
    if (s.status === "completed") entry.completed += 1;
    campaignMap.set(key, entry);
  }

  const deptMap = new Map<string, { sessions: number; completed: number }>();
  for (const s of sessions) {
    const dept = s.participant?.department?.trim() || "Unknown";
    const entry = deptMap.get(dept) ?? { sessions: 0, completed: 0 };
    entry.sessions += 1;
    if (s.status === "completed") entry.completed += 1;
    deptMap.set(dept, entry);
  }

  const recentAbandoned = sessions
    .filter((s) => s.status !== "completed" && s.completionPct < 100)
    .slice(0, 10)
    .map((s) => ({
      sessionId: s.id,
      participant: s.participant?.fullName ?? null,
      completionPct: s.completionPct,
      lastActiveAt: s.updatedAt.toISOString(),
      campaignName: s.campaign?.name ?? null,
    }));

  return {
    totals: {
      sessions: sessions.length,
      active,
      completed,
      completionRate:
        started > 0 ? Math.round((completed / started) * 1000) / 10 : null,
      abandonmentRate:
        started > 0
          ? Math.round(((started - completed) / started) * 1000) / 10
          : null,
      avgCompletionMinutes: averageCompletionMinutes(inputs),
      avgProgressPct:
        sessions.length > 0
          ? Math.round((progressSum / sessions.length) * 10) / 10
          : null,
    },
    funnel,
    byCampaign: [...campaignMap.entries()].map(([campaignId, v]) => ({
      campaignId: campaignId === "none" ? null : campaignId,
      campaignName: v.name,
      sessions: v.sessions,
      completed: v.completed,
      completionRate:
        v.sessions > 0
          ? Math.round((v.completed / v.sessions) * 1000) / 10
          : null,
      avgProgressPct:
        v.sessions > 0
          ? Math.round((v.progressSum / v.sessions) * 10) / 10
          : null,
    })),
    byDepartment: [...deptMap.entries()].map(([department, v]) => ({
      department,
      sessions: v.sessions,
      completed: v.completed,
      completionRate:
        v.sessions > 0
          ? Math.round((v.completed / v.sessions) * 1000) / 10
          : null,
    })),
    recentAbandoned,
  };
}

export { FUNNEL_STAGE_LABELS, FUNNEL_STAGE_ORDER };
