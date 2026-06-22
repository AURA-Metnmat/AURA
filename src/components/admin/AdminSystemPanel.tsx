"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Database, Loader2, RefreshCw, Server } from "lucide-react";
import type { SystemOpsSnapshot } from "@/lib/ops/system-status";

interface AdminSystemPanelProps {
  glassCard: string;
}

function statusColor(status: string): string {
  if (status === "ok") return "text-emerald-400";
  if (status === "degraded") return "text-amber-400";
  return "text-red-400";
}

export default function AdminSystemPanel({ glassCard }: AdminSystemPanelProps) {
  const [data, setData] = useState<SystemOpsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/system/status", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load system status");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load system status");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-8 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`${glassCard} p-4 text-sm text-red-400`}>
        {error ?? "System status unavailable"}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Server className="w-4 h-4 text-sky-400" />
          Platform health
        </h3>
        <button
          type="button"
          onClick={() => void load()}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`${glassCard} p-4`}>
          <p className="text-[10px] uppercase text-slate-500">Overall</p>
          <p className={`text-xl font-bold mt-1 ${statusColor(data.health.status)}`}>
            {data.health.status}
          </p>
        </div>
        <div className={`${glassCard} p-4`}>
          <p className="text-[10px] uppercase text-slate-500 flex items-center gap-1">
            <Database className="w-3 h-3" />
            Database
          </p>
          <p className="text-xl font-bold mt-1 text-slate-100 tabular-nums">
            {data.health.dbLatencyMs}ms
          </p>
        </div>
        <div className={`${glassCard} p-4`}>
          <p className="text-[10px] uppercase text-slate-500">AI primary</p>
          <p className="text-xl font-bold mt-1 text-slate-100 capitalize">
            {data.health.ai.primary}
          </p>
        </div>
        <div className={`${glassCard} p-4`}>
          <p className="text-[10px] uppercase text-slate-500 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Active interviews
          </p>
          <p className="text-xl font-bold mt-1 text-amber-400 tabular-nums">
            {data.counts.activeInterviewSessions}
          </p>
        </div>
      </div>

      <div className={`${glassCard} p-4 grid sm:grid-cols-2 gap-3 text-sm`}>
        <p className="text-slate-400">
          Companies: <span className="text-slate-200">{data.counts.companies}</span>
        </p>
        <p className="text-slate-400">
          Sessions: <span className="text-slate-200">{data.counts.interviewSessions}</span>
        </p>
        <p className="text-slate-400">
          Exports (24h): <span className="text-slate-200">{data.counts.exportsLast24h}</span>
        </p>
        <p className="text-slate-400">
          Failed logins (24h):{" "}
          <span className={data.counts.failedLoginsLast24h > 0 ? "text-amber-400" : "text-slate-200"}>
            {data.counts.failedLoginsLast24h}
          </span>
        </p>
        <p className="text-slate-400">
          Reindex pending: <span className="text-slate-200">{data.reindexJobs.pending}</span>
        </p>
        <p className="text-slate-400">
          Reindex failed:{" "}
          <span className={data.reindexJobs.failed > 0 ? "text-red-400" : "text-slate-200"}>
            {data.reindexJobs.failed}
          </span>
        </p>
      </div>

      <p className="text-[10px] text-slate-600">
        Updated {new Date(data.generatedAt).toLocaleString()}
        {data.reindexJobs.recoveredStale > 0
          ? ` · recovered ${data.reindexJobs.recoveredStale} stale reindex job(s)`
          : ""}
      </p>
    </section>
  );
}
