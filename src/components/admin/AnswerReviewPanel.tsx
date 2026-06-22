"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  REVIEW_STATUS,
  REVIEW_STATUS_LABELS,
  type ReviewStatus,
} from "@/lib/knowledge/review";
import type { QualityKpis } from "@/lib/refinement/quality-stats";

interface AnswerRow {
  id: string;
  sessionId: string;
  interactionType: string;
  rawText: string;
  section: string | null;
  qualityScore: number | null;
  confidenceScore: number | null;
  reviewStatus: ReviewStatus;
  duplicateOfId: string | null;
  contradictionFlags: { type: string; detail: string }[];
  reviewNotes: string | null;
  participant: string | null;
  department: string | null;
  designation: string | null;
  campaignId: string | null;
  campaignName: string | null;
  createdAt: string;
}

interface AnswerReviewPanelProps {
  companyId: string;
  glassCard: string;
}

const STATUS_STYLES: Record<ReviewStatus, string> = {
  PENDING: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  VALIDATED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  NEEDS_ATTENTION: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  REJECTED: "bg-red-500/15 text-red-300 border-red-500/30",
};

function pct(score: number | null): string {
  if (score == null) return "—";
  return `${Math.round(score * 100)}%`;
}

export default function AnswerReviewPanel({ companyId, glassCard }: AnswerReviewPanelProps) {
  const [kpis, setKpis] = useState<QualityKpis | null>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [campaignFilter, setCampaignFilter] = useState<string>("");
  const [confidenceMax, setConfidenceMax] = useState<string>("0.5");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (departmentFilter) params.set("department", departmentFilter);
      if (campaignFilter) params.set("campaignId", campaignFilter);
      if (confidenceMax) params.set("confidenceMax", confidenceMax);

      const [kpiRes, ansRes] = await Promise.all([
        fetch(`/api/companies/${companyId}/quality`, { credentials: "include" }),
        fetch(`/api/companies/${companyId}/answers?${params}`, { credentials: "include" }),
      ]);

      const kpiData = await kpiRes.json();
      const ansData = await ansRes.json();
      if (kpiRes.ok) setKpis(kpiData.kpis);
      if (ansRes.ok) setAnswers(ansData.answers ?? []);
    } finally {
      setLoading(false);
    }
  }, [companyId, statusFilter, departmentFilter, campaignFilter, confidenceMax]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateReview(answerId: string, reviewStatus: ReviewStatus) {
    setSavingId(answerId);
    try {
      const res = await fetch(`/api/companies/${companyId}/answers/${answerId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Update failed");
      }
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSavingId(null);
    }
  }

  const departments = [...new Set(kpis?.byDepartment.map((d) => d.department) ?? [])];
  const campaigns = kpis?.byCampaign.filter((c) => c.campaignId !== "none") ?? [];

  return (
    <div className="space-y-6">
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className={`${glassCard} p-4`}>
            <p className="text-[10px] uppercase text-slate-500">Data quality</p>
            <p className="text-2xl font-bold text-amber-300 tabular-nums">
              {kpis.dataQualityScore != null ? pct(kpis.dataQualityScore) : "—"}
            </p>
          </div>
          <div className={`${glassCard} p-4`}>
            <p className="text-[10px] uppercase text-slate-500">Answers</p>
            <p className="text-2xl font-bold text-slate-100 tabular-nums">{kpis.totalAnswers}</p>
          </div>
          <div className={`${glassCard} p-4`}>
            <p className="text-[10px] uppercase text-slate-500">Avg confidence</p>
            <p className="text-2xl font-bold text-sky-300 tabular-nums">
              {pct(kpis.avgConfidenceScore)}
            </p>
          </div>
          <div className={`${glassCard} p-4`}>
            <p className="text-[10px] uppercase text-slate-500">Pending review</p>
            <p className="text-2xl font-bold text-slate-300 tabular-nums">{kpis.review.pending}</p>
          </div>
          <div className={`${glassCard} p-4`}>
            <p className="text-[10px] uppercase text-slate-500">Low confidence</p>
            <p className="text-2xl font-bold text-amber-400 tabular-nums">
              {kpis.lowConfidenceCount}
            </p>
          </div>
          <div className={`${glassCard} p-4`}>
            <p className="text-[10px] uppercase text-slate-500">Flags</p>
            <p className="text-sm text-slate-400 mt-1">
              {kpis.duplicateCount} dup · {kpis.contradictionCount} contra
            </p>
          </div>
        </div>
      )}

      <div className={`${glassCard} p-4 flex flex-wrap gap-3 items-end`}>
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Filter className="w-4 h-4" />
          Filters
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">All statuses</option>
          {Object.entries(REVIEW_STATUS_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">All campaigns</option>
          {campaigns.map((c) => (
            <option key={c.campaignId} value={c.campaignId}>
              {c.campaignName}
            </option>
          ))}
        </select>
        <label className="text-xs text-slate-500 flex items-center gap-2">
          Max confidence
          <input
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={confidenceMax}
            onChange={(e) => setConfidenceMax(e.target.value)}
            className="w-20 rounded-lg border border-white/10 bg-slate-900/60 px-2 py-1.5 text-sm text-slate-100"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-white/10 text-slate-300"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : answers.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-12">
          No answers match filters. Answers are captured from every interview response and scored
          automatically.
        </p>
      ) : (
        <div className="space-y-3">
          {answers.map((a) => (
            <div key={a.id} className={`${glassCard} p-4 space-y-3`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-slate-200">{a.rawText}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {a.participant ?? "Unknown"} · {a.department ?? "—"} · Section {a.section ?? "—"}
                    {a.campaignName ? ` · ${a.campaignName}` : ""}
                  </p>
                </div>
                <span
                  className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLES[a.reviewStatus]}`}
                >
                  {REVIEW_STATUS_LABELS[a.reviewStatus]}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                <span>Quality: {pct(a.qualityScore)}</span>
                <span>Confidence: {pct(a.confidenceScore)}</span>
                <span>Type: {a.interactionType}</span>
                {a.duplicateOfId && (
                  <span className="text-amber-400">Possible duplicate</span>
                )}
                {a.contradictionFlags.length > 0 && (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {a.contradictionFlags[0]?.detail}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={savingId === a.id}
                  onClick={() => void updateReview(a.id, REVIEW_STATUS.VALIDATED)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-emerald-500/30 text-emerald-300"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Validate
                </button>
                <button
                  type="button"
                  disabled={savingId === a.id}
                  onClick={() => void updateReview(a.id, REVIEW_STATUS.NEEDS_ATTENTION)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-amber-500/30 text-amber-300"
                >
                  <Clock className="w-3 h-3" />
                  Flag
                </button>
                <button
                  type="button"
                  disabled={savingId === a.id}
                  onClick={() => void updateReview(a.id, REVIEW_STATUS.REJECTED)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-red-500/30 text-red-300"
                >
                  <XCircle className="w-3 h-3" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
