import { db } from "@/lib/db";
import type { AdminSession } from "@/lib/auth/admin-rbac";
import { reindexCompanyKnowledge } from "@/lib/knowledge/indexer";
import {
  REINDEX_JOB_STATUS,
  type ReindexJobView,
  type ReindexScope,
} from "@/lib/knowledge/reindex-job-types";

function toJobView(job: {
  id: string;
  companyId: string;
  scope: string;
  status: string;
  referenceCount: number | null;
  experienceCount: number | null;
  errorMessage: string | null;
  actorEmail: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}): ReindexJobView {
  return {
    id: job.id,
    companyId: job.companyId,
    scope: job.scope as ReindexScope,
    status: job.status as ReindexJobView["status"],
    referenceCount: job.referenceCount,
    experienceCount: job.experienceCount,
    errorMessage: job.errorMessage,
    actorEmail: job.actorEmail,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

export async function findActiveReindexJob(
  companyId: string
): Promise<ReindexJobView | null> {
  const job = await db.knowledgeReindexJob.findFirst({
    where: {
      companyId,
      status: { in: [REINDEX_JOB_STATUS.PENDING, REINDEX_JOB_STATUS.RUNNING] },
    },
    orderBy: { createdAt: "desc" },
  });
  return job ? toJobView(job) : null;
}

export async function enqueueReindexJob(params: {
  companyId: string;
  scope: ReindexScope;
  session?: AdminSession | null;
}): Promise<{ job: ReindexJobView; reused: boolean }> {
  const existing = await findActiveReindexJob(params.companyId);
  if (existing && existing.scope === params.scope) {
    return { job: existing, reused: true };
  }

  const job = await db.knowledgeReindexJob.create({
    data: {
      companyId: params.companyId,
      scope: params.scope,
      actorEmail: params.session?.email ?? null,
      adminUserId: params.session?.adminUserId ?? null,
    },
  });

  return { job: toJobView(job), reused: false };
}

async function markReindexJobFailed(jobId: string, message: string): Promise<void> {
  await db.knowledgeReindexJob.update({
    where: { id: jobId },
    data: {
      status: REINDEX_JOB_STATUS.FAILED,
      errorMessage: message.slice(0, 2000),
      completedAt: new Date(),
    },
  });
}

export async function runReindexJob(jobId: string): Promise<void> {
  const claimed = await db.knowledgeReindexJob.updateMany({
    where: { id: jobId, status: REINDEX_JOB_STATUS.PENDING },
    data: {
      status: REINDEX_JOB_STATUS.RUNNING,
      startedAt: new Date(),
    },
  });

  if (claimed.count === 0) return;

  const job = await db.knowledgeReindexJob.findUnique({
    where: { id: jobId },
    include: { company: { select: { slug: true } } },
  });

  if (!job?.company) {
    await markReindexJobFailed(jobId, "Company not found");
    return;
  }

  try {
    const scope = job.scope as ReindexScope;
    const result = await reindexCompanyKnowledge({
      companySlug: job.company.slug,
      companyId: job.companyId,
      scope,
    });

    await db.knowledgeReindexJob.update({
      where: { id: jobId },
      data: {
        status: REINDEX_JOB_STATUS.COMPLETED,
        referenceCount: result.reference,
        experienceCount: result.experience,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reindex failed";
    await markReindexJobFailed(jobId, message);
  }
}

export async function getReindexJob(
  companyId: string,
  jobId: string
): Promise<ReindexJobView | null> {
  const job = await db.knowledgeReindexJob.findFirst({
    where: { id: jobId, companyId },
  });
  return job ? toJobView(job) : null;
}

export async function listReindexJobs(
  companyId: string,
  limit = 20
): Promise<ReindexJobView[]> {
  const jobs = await db.knowledgeReindexJob.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 50),
  });
  return jobs.map(toJobView);
}

export async function getLatestReindexJob(
  companyId: string
): Promise<ReindexJobView | null> {
  const job = await db.knowledgeReindexJob.findFirst({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
  return job ? toJobView(job) : null;
}

const STALE_RUNNING_MS = 30 * 60 * 1000;
const STALE_PENDING_MS = 15 * 60 * 1000;

export async function recoverStaleReindexJobs(): Promise<number> {
  const now = Date.now();
  let recovered = 0;

  const staleRunning = await db.knowledgeReindexJob.findMany({
    where: {
      status: REINDEX_JOB_STATUS.RUNNING,
      startedAt: { lt: new Date(now - STALE_RUNNING_MS) },
    },
    select: { id: true },
  });

  if (staleRunning.length > 0) {
    await db.knowledgeReindexJob.updateMany({
      where: { id: { in: staleRunning.map((j) => j.id) } },
      data: {
        status: REINDEX_JOB_STATUS.FAILED,
        errorMessage: "Reindex timed out — retry from admin panel",
        completedAt: new Date(),
      },
    });
    recovered += staleRunning.length;
  }

  const stalePending = await db.knowledgeReindexJob.findMany({
    where: {
      status: REINDEX_JOB_STATUS.PENDING,
      createdAt: { lt: new Date(now - STALE_PENDING_MS) },
    },
    select: { id: true },
    take: 3,
  });

  for (const job of stalePending) {
    void runReindexJob(job.id).catch((error) => {
      console.error("Stale reindex recovery failed:", job.id, error);
    });
    recovered += 1;
  }

  return recovered;
}
