import type { ReindexJobView } from "@/lib/knowledge/reindex-job-types";
import { isTerminalReindexStatus } from "@/lib/knowledge/reindex-job-types";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 90;

export async function pollReindexJob(
  companyId: string,
  jobId: string,
  onUpdate?: (job: ReindexJobView) => void
): Promise<ReindexJobView> {
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    const res = await fetch(
      `/api/companies/${companyId}/knowledge/reindex?jobId=${encodeURIComponent(jobId)}`,
      { credentials: "include" }
    );
    const data = (await res.json()) as { job?: ReindexJobView; error?: string };
    if (!res.ok || !data.job) {
      throw new Error(data.error ?? "Failed to check reindex status");
    }

    onUpdate?.(data.job);
    if (isTerminalReindexStatus(data.job.status)) {
      return data.job;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Reindex is taking longer than expected. Check back in a few minutes.");
}
