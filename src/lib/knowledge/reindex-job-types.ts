export const REINDEX_JOB_STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ReindexJobStatus =
  (typeof REINDEX_JOB_STATUS)[keyof typeof REINDEX_JOB_STATUS];

export const REINDEX_SCOPES = ["all", "reference", "experience"] as const;
export type ReindexScope = (typeof REINDEX_SCOPES)[number];

export interface ReindexJobView {
  id: string;
  companyId: string;
  scope: ReindexScope;
  status: ReindexJobStatus;
  referenceCount: number | null;
  experienceCount: number | null;
  errorMessage: string | null;
  actorEmail: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export function parseReindexScope(value: unknown): ReindexScope {
  if (value === "reference" || value === "experience") return value;
  return "all";
}

export function isTerminalReindexStatus(status: string): boolean {
  return (
    status === REINDEX_JOB_STATUS.COMPLETED || status === REINDEX_JOB_STATUS.FAILED
  );
}

export function formatReindexJobMessage(job: Pick<
  ReindexJobView,
  "status" | "scope" | "referenceCount" | "experienceCount" | "errorMessage"
>): string {
  if (job.status === REINDEX_JOB_STATUS.FAILED) {
    return job.errorMessage ?? "Reindex failed";
  }
  if (job.status === REINDEX_JOB_STATUS.COMPLETED) {
    const ref = job.referenceCount ?? 0;
    const exp = job.experienceCount ?? 0;
    if (job.scope === "reference") return `Indexed ${ref} reference chunks`;
    if (job.scope === "experience") return `Indexed ${exp} experience chunks`;
    return `Indexed ${ref} reference and ${exp} experience chunks`;
  }
  if (job.status === REINDEX_JOB_STATUS.RUNNING) return "Reindex in progress…";
  return "Reindex queued…";
}
