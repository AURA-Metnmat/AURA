"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import type { ReindexJobView } from "@/lib/knowledge/reindex-job-types";
import { formatReindexJobMessage, isTerminalReindexStatus } from "@/lib/knowledge/reindex-job-types";

interface ReindexJobHistoryProps {
  companyId: string;
  glassCard: string;
  refreshKey?: number;
}

function statusColor(status: string): string {
  if (status === "completed") return "text-emerald-400";
  if (status === "failed") return "text-red-400";
  if (status === "running") return "text-amber-400";
  return "text-slate-400";
}

export default function ReindexJobHistory({
  companyId,
  glassCard,
  refreshKey = 0,
}: ReindexJobHistoryProps) {
  const [jobs, setJobs] = useState<ReindexJobView[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/knowledge/reindex?list=true`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (res.ok) setJobs(data.jobs ?? []);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const hasActive = jobs.some((j) => !isTerminalReindexStatus(j.status));
    if (!hasActive) return;

    const timer = window.setInterval(() => {
      void load();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [jobs, load]);

  return (
    <section className={`${glassCard} rounded-xl p-4 mt-4`}>
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-amber-400" />
        <h4 className="text-sm font-semibold">Reindex jobs</h4>
      </div>

      {loading && jobs.length === 0 ? (
        <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading…
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-slate-500 text-sm">No background reindex jobs yet.</p>
      ) : (
        <ul className="space-y-2 max-h-40 overflow-y-auto">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="text-sm border-b border-white/5 pb-2 last:border-0"
            >
              <div className="flex justify-between gap-2">
                <span className={`text-xs uppercase ${statusColor(job.status)}`}>
                  {job.status}
                </span>
                <span className="text-[10px] text-slate-600">
                  {new Date(job.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {job.scope} · {formatReindexJobMessage(job)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
