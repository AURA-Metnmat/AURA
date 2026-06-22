"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, History, Loader2, RefreshCw } from "lucide-react";
import type { ExportLogRow } from "@/lib/exports/record-export";
import { formatExportSummary } from "@/lib/exports/record-export";

interface ExportHistoryPanelProps {
  companyId: string;
  glassCard: string;
  refreshKey?: number;
}

export default function ExportHistoryPanel({
  companyId,
  glassCard,
  refreshKey = 0,
}: ExportHistoryPanelProps) {
  const [exports, setExports] = useState<ExportLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/exports?limit=30`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load export history");
      setExports(data.exports ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load export history");
      setExports([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <section className={`${glassCard} rounded-xl p-4 mt-4`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" />
          <h4 className="text-sm font-semibold">Export history</h4>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading…
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : exports.length === 0 ? (
        <p className="text-slate-500 text-sm">No exports recorded yet.</p>
      ) : (
        <ul className="space-y-2 max-h-56 overflow-y-auto">
          {exports.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3 text-sm border-b border-white/5 pb-2 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-slate-200 truncate">{row.exportTypeLabel}</p>
                <p className="text-xs text-slate-500">
                  {formatExportSummary(row)}
                  {row.fileName ? ` · ${row.fileName}` : ""}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  {row.actorEmail ?? "Admin"} · {new Date(row.createdAt).toLocaleString()}
                </p>
              </div>
              <Download className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-1" aria-hidden />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
