"use client";

import { useCallback, useState } from "react";
import {
  REINDEX_JOB_STATUS,
  formatReindexJobMessage,
  type ReindexScope,
} from "@/lib/knowledge/reindex-job-types";
import { pollReindexJob } from "@/lib/knowledge/poll-reindex-job";

export function useReindexJob(companyId: string) {
  const [running, setRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const startReindex = useCallback(
    async (scope: ReindexScope) => {
      setRunning(true);
      setStatusMessage("Queuing reindex job…");

      try {
        const res = await fetch(`/api/companies/${companyId}/knowledge/reindex`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope }),
        });
        const data = (await res.json()) as {
          error?: string;
          job?: { id: string; status: string };
        };

        if (!res.ok || !data.job) {
          throw new Error(data.error ?? "Failed to queue reindex");
        }

        const job = await pollReindexJob(companyId, data.job.id, (update) => {
          setStatusMessage(formatReindexJobMessage(update));
        });

        if (job.status === REINDEX_JOB_STATUS.FAILED) {
          throw new Error(job.errorMessage ?? "Reindex failed");
        }

        setStatusMessage(formatReindexJobMessage(job));
        return job;
      } finally {
        setRunning(false);
      }
    },
    [companyId]
  );

  const clearStatus = useCallback(() => setStatusMessage(null), []);

  return { startReindex, running, statusMessage, clearStatus };
}
