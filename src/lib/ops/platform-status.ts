import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hasClaudeProvider, hasOpenAIProvider } from "@/lib/ai/providers";
import { AUDIT_ACTIONS } from "@/lib/auth/admin-audit";
import { REINDEX_JOB_STATUS } from "@/lib/knowledge/reindex-job-types";
import { recoverStaleReindexJobs } from "@/lib/knowledge/reindex-jobs";
import {
  deriveSystemStatus,
  hoursAgo,
  type SystemOpsSnapshot,
} from "@/lib/ops/system-status";

async function measureDbLatency(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

export async function getPlatformSystemStatus(): Promise<SystemOpsSnapshot> {
  env();
  const dbProbe = await measureDbLatency();
  const since24h = hoursAgo(24);

  const recoveredStale = await recoverStaleReindexJobs();

  const [
    companies,
    interviewSessions,
    activeInterviewSessions,
    adminUsers,
    exportsLast24h,
    failedLoginsLast24h,
    pendingReindex,
    runningReindex,
    failedReindex,
  ] = await Promise.all([
    db.company.count(),
    db.interviewSession.count(),
    db.interviewSession.count({ where: { status: { not: "completed" } } }),
    db.adminUser.count({ where: { isActive: true } }),
    db.dataExportLog.count({ where: { createdAt: { gte: since24h } } }),
    db.adminAuditLog.count({
      where: { action: AUDIT_ACTIONS.ADMIN_LOGIN_FAILED, createdAt: { gte: since24h } },
    }),
    db.knowledgeReindexJob.count({ where: { status: REINDEX_JOB_STATUS.PENDING } }),
    db.knowledgeReindexJob.count({ where: { status: REINDEX_JOB_STATUS.RUNNING } }),
    db.knowledgeReindexJob.count({ where: { status: REINDEX_JOB_STATUS.FAILED } }),
  ]);

  const health = {
    status: dbProbe.ok ? ("ok" as const) : ("error" as const),
    dbLatencyMs: dbProbe.latencyMs,
    ai: {
      claude: hasClaudeProvider(),
      openai: hasOpenAIProvider(),
      primary: hasClaudeProvider() ? "claude" : hasOpenAIProvider() ? "openai" : "none",
    },
  };

  const overall = deriveSystemStatus(health, failedReindex, pendingReindex);

  return {
    health: { ...health, status: overall },
    counts: {
      companies,
      interviewSessions,
      activeInterviewSessions,
      adminUsers,
      exportsLast24h,
      failedLoginsLast24h,
    },
    reindexJobs: {
      pending: pendingReindex,
      running: runningReindex,
      failed: failedReindex,
      recoveredStale,
    },
    generatedAt: new Date().toISOString(),
  };
}
