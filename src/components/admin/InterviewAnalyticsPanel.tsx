"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Loader2, RefreshCw, TrendingDown, Users } from "lucide-react";
import type { CompanyInterviewAnalytics } from "@/lib/analytics/company-analytics";

interface InterviewAnalyticsPanelProps {
  companyId: string;
  glassCard: string;
}

function pct(value: number | null, suffix = "%"): string {
  if (value == null) return "—";
  return `${value}${suffix}`;
}

export default function InterviewAnalyticsPanel({
  companyId,
  glassCard,
}: InterviewAnalyticsPanelProps) {
  const [data, setData] = useState<CompanyInterviewAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/analytics`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load analytics");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading analytics…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-sm">{error ?? "No data"}</p>
        <button onClick={() => void load()} className="mt-3 text-amber-400 text-sm underline">
          Retry
        </button>
      </div>
    );
  }

  const maxFunnel = Math.max(...data.funnel.map((f) => f.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-lg">Interview Analytics</h3>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total sessions", value: String(data.totals.sessions) },
          { label: "Completion rate", value: pct(data.totals.completionRate) },
          { label: "Abandonment rate", value: pct(data.totals.abandonmentRate) },
          {
            label: "Avg time (completed)",
            value:
              data.totals.avgCompletionMinutes != null
                ? `${data.totals.avgCompletionMinutes} min`
                : "—",
          },
        ].map((kpi) => (
          <div key={kpi.label} className={`${glassCard} rounded-xl p-4`}>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">{kpi.label}</p>
            <p className="text-2xl font-bold text-amber-400 mt-1 tabular-nums">{kpi.value}</p>
          </div>
        ))}
      </div>

      <section className={`${glassCard} rounded-xl p-5`}>
        <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          Completion funnel
        </h4>
        <div className="space-y-3">
          {data.funnel.map((stage) => (
            <div key={stage.stage}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">{stage.label}</span>
                <span className="text-slate-500 tabular-nums">
                  {stage.count} · {pct(stage.conversionPct)} of started
                  {stage.dropOff > 0 && (
                    <span className="text-red-400/80 ml-2">
                      −{stage.dropOff} ({pct(stage.dropOffPct)})
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all"
                  style={{ width: `${(stage.count / maxFunnel) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className={`${glassCard} rounded-xl p-5`}>
          <h4 className="text-sm font-semibold mb-3">By campaign</h4>
          {data.byCampaign.length === 0 ? (
            <p className="text-slate-500 text-sm">No sessions yet.</p>
          ) : (
            <div className="space-y-2">
              {data.byCampaign.map((row) => (
                <div
                  key={row.campaignId ?? "default"}
                  className="flex justify-between text-sm border-b border-white/5 pb-2"
                >
                  <span className="text-slate-300 truncate pr-2">{row.campaignName}</span>
                  <span className="text-slate-500 tabular-nums shrink-0">
                    {row.completed}/{row.sessions} · {pct(row.completionRate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${glassCard} rounded-xl p-5`}>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            Recent abandoned
          </h4>
          {data.recentAbandoned.length === 0 ? (
            <p className="text-slate-500 text-sm">No abandoned sessions.</p>
          ) : (
            <div className="space-y-2">
              {data.recentAbandoned.map((row) => (
                <div
                  key={row.sessionId}
                  className="text-sm border-b border-white/5 pb-2"
                >
                  <p className="text-slate-300">
                    {row.participant ?? "Anonymous"} · {row.completionPct}%
                  </p>
                  <p className="text-xs text-slate-500">
                    {row.campaignName ?? "No campaign"} ·{" "}
                    {new Date(row.lastActiveAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
