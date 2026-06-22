export interface SystemHealthSnapshot {
  status: "ok" | "degraded" | "error";
  dbLatencyMs: number;
  ai: {
    claude: boolean;
    openai: boolean;
    dual?: boolean;
    primary: string;
  };
}

export interface SystemOpsSnapshot {
  health: SystemHealthSnapshot;
  counts: {
    companies: number;
    interviewSessions: number;
    activeInterviewSessions: number;
    adminUsers: number;
    exportsLast24h: number;
    failedLoginsLast24h: number;
  };
  reindexJobs: {
    pending: number;
    running: number;
    failed: number;
    recoveredStale: number;
  };
  generatedAt: string;
}

export function deriveSystemStatus(
  health: SystemHealthSnapshot,
  failedReindexJobs: number,
  pendingReindexJobs: number
): "ok" | "degraded" | "error" {
  if (health.status === "error") return "error";
  if (failedReindexJobs > 0 || pendingReindexJobs > 5 || health.dbLatencyMs > 2000) {
    return "degraded";
  }
  return "ok";
}

export function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}
