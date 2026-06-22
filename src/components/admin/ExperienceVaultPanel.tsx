"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Download,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
} from "lucide-react";
import {
  REVIEW_STATUS,
  REVIEW_STATUS_LABELS,
  TOPIC_CATEGORIES,
  topicCategoryLabel,
  type ReviewStatus,
} from "@/lib/knowledge/review";
import ExportHistoryPanel from "@/components/admin/ExportHistoryPanel";

export interface ExperienceItem {
  id: string;
  sourceKind: string;
  sourceLabel: string;
  content: string;
  preview: string;
  charCount: number;
  reviewStatus: ReviewStatus;
  topicCategory: string;
  reviewNotes: string | null;
  reviewedAt: string | null;
  sessionId: string | null;
  participant: string | null;
  updatedAt: string;
}

interface KnowledgeStats {
  experience: number;
  review?: {
    pending: number;
    validated: number;
    needsAttention: number;
    rejected: number;
  };
  validatedByCategory?: Record<string, number>;
}

interface ExperienceVaultPanelProps {
  companyId: string;
  companySlug: string;
  glassCard: string;
  gatheredTotals?: {
    sessions: number;
    completed: number;
    painPoints: number;
    reports: number;
  };
  onOpenSession: (sessionId: string) => void;
  onReindexComplete?: () => void;
}

const STATUS_FILTERS: { id: ReviewStatus | "ALL"; label: string; icon: typeof Clock }[] = [
  { id: "ALL", label: "All", icon: Filter },
  { id: REVIEW_STATUS.PENDING, label: "Pending", icon: Clock },
  { id: REVIEW_STATUS.VALIDATED, label: "Validated", icon: CheckCircle2 },
  { id: REVIEW_STATUS.NEEDS_ATTENTION, label: "Needs attention", icon: AlertCircle },
  { id: REVIEW_STATUS.REJECTED, label: "Rejected", icon: XCircle },
];

function statusStyles(status: ReviewStatus) {
  switch (status) {
    case REVIEW_STATUS.VALIDATED:
      return "bg-emerald-950/50 text-emerald-300 border-emerald-800/50";
    case REVIEW_STATUS.NEEDS_ATTENTION:
      return "bg-amber-950/50 text-amber-300 border-amber-800/50";
    case REVIEW_STATUS.REJECTED:
      return "bg-red-950/50 text-red-300 border-red-800/50";
    default:
      return "bg-slate-800/80 text-slate-400 border-white/10";
  }
}

export default function ExperienceVaultPanel({
  companyId,
  glassCard,
  gatheredTotals,
  onOpenSession,
  onReindexComplete,
}: ExperienceVaultPanelProps) {
  const [items, setItems] = useState<ExperienceItem[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [exportHistoryKey, setExportHistoryKey] = useState(0);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ list: "experience", limit: "200" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);

      const res = await fetch(`/api/companies/${companyId}/knowledge?${params}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setItems(data.experienceList ?? []);
        setStats(data.stats ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, statusFilter, categoryFilter]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function reindexExperience() {
    setReindexing(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/knowledge/reindex`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "experience" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Reindex failed");
      }
      await loadItems();
      onReindexComplete?.();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Reindex failed");
    } finally {
      setReindexing(false);
    }
  }

  async function updateReview(
    chunkId: string,
    patch: { reviewStatus?: ReviewStatus; topicCategory?: string; reviewNotes?: string }
  ) {
    setSavingId(chunkId);
    try {
      const res = await fetch(`/api/companies/${companyId}/knowledge/chunks/${chunkId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");

      setItems((prev) =>
        prev.map((item) =>
          item.id === chunkId
            ? {
                ...item,
                reviewStatus: data.reviewStatus,
                topicCategory: data.topicCategory,
                reviewNotes: data.reviewNotes,
                reviewedAt: data.reviewedAt,
              }
            : item
        )
      );
      await loadItems();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save review");
    } finally {
      setSavingId(null);
    }
  }

  async function downloadExport(format: "xlsx" | "jsonl", filter: string) {
    const key = `${format}-${filter}`;
    setExporting(key);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/knowledge/export?format=${format}&filter=${filter}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Export failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      const fileName = match?.[1] ?? `experience-export.${format === "jsonl" ? "jsonl" : "xlsx"}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setExportHistoryKey((k) => k + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }

  const review = stats?.review;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-slate-950/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-lg">Experience Vault — ML Training Corpus</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Review tacit knowledge extracted from interviews. Mark each record as{" "}
              <span className="text-emerald-400">validated</span>,{" "}
              <span className="text-amber-400">needs attention</span>, or{" "}
              <span className="text-red-400">rejected</span>, assign categories, then export refined
              datasets for your AIML model.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => reindexExperience()}
              disabled={reindexing}
              className="flex items-center gap-2 text-sm border border-emerald-500/30 text-emerald-300 px-3 py-2 rounded-lg hover:bg-emerald-950/40 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${reindexing ? "animate-spin" : ""}`} />
              {reindexing ? "Indexing..." : "Re-index"}
            </button>
            <button
              type="button"
              onClick={() => downloadExport("xlsx", "validated")}
              disabled={!!exporting || !review?.validated}
              className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium px-3 py-2 rounded-lg"
            >
              {exporting === "xlsx-validated" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export validated (Excel)
            </button>
            <button
              type="button"
              onClick={() => downloadExport("jsonl", "validated")}
              disabled={!!exporting || !review?.validated}
              className="flex items-center gap-2 text-sm border border-white/10 text-slate-200 px-3 py-2 rounded-lg hover:bg-slate-800/60 disabled:opacity-40"
            >
              {exporting === "jsonl-validated" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              JSONL
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-5">
          <div className="rounded-lg bg-slate-950/50 border border-white/5 px-3 py-2 text-center">
            <p className="text-lg font-bold text-white">{stats?.experience ?? 0}</p>
            <p className="text-[10px] uppercase text-slate-500">Total chunks</p>
          </div>
          <div className="rounded-lg bg-slate-950/50 border border-white/5 px-3 py-2 text-center">
            <p className="text-lg font-bold text-slate-400">{review?.pending ?? 0}</p>
            <p className="text-[10px] uppercase text-slate-500">Pending</p>
          </div>
          <div className="rounded-lg bg-emerald-950/30 border border-emerald-800/30 px-3 py-2 text-center">
            <p className="text-lg font-bold text-emerald-400">{review?.validated ?? 0}</p>
            <p className="text-[10px] uppercase text-slate-500">Validated</p>
          </div>
          <div className="rounded-lg bg-amber-950/30 border border-amber-800/30 px-3 py-2 text-center">
            <p className="text-lg font-bold text-amber-400">{review?.needsAttention ?? 0}</p>
            <p className="text-[10px] uppercase text-slate-500">Attention</p>
          </div>
          <div className="rounded-lg bg-red-950/20 border border-red-900/30 px-3 py-2 text-center">
            <p className="text-lg font-bold text-red-400">{review?.rejected ?? 0}</p>
            <p className="text-[10px] uppercase text-slate-500">Rejected</p>
          </div>
          {gatheredTotals && (
            <>
              <div className="rounded-lg bg-slate-950/50 border border-white/5 px-3 py-2 text-center">
                <p className="text-lg font-bold text-sky-400">{gatheredTotals.sessions}</p>
                <p className="text-[10px] uppercase text-slate-500">Sessions</p>
              </div>
              <div className="rounded-lg bg-slate-950/50 border border-white/5 px-3 py-2 text-center">
                <p className="text-lg font-bold text-sky-400">{gatheredTotals.completed}</p>
                <p className="text-[10px] uppercase text-slate-500">Completed</p>
              </div>
              <div className="rounded-lg bg-slate-950/50 border border-white/5 px-3 py-2 text-center">
                <p className="text-lg font-bold text-sky-400">{gatheredTotals.reports}</p>
                <p className="text-[10px] uppercase text-slate-500">Reports</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatusFilter(id)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === id
                ? "bg-slate-700 text-white border-slate-600"
                : "bg-slate-900/50 text-slate-400 border-white/10 hover:border-white/20"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {id !== "ALL" && review && (
              <span className="opacity-70">
                (
                {id === REVIEW_STATUS.PENDING
                  ? review.pending
                  : id === REVIEW_STATUS.VALIDATED
                    ? review.validated
                    : id === REVIEW_STATUS.NEEDS_ATTENTION
                      ? review.needsAttention
                      : review.rejected}
                )
              </span>
            )}
          </button>
        ))}

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="ml-auto text-xs bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-slate-300 outline-none"
        >
          <option value="">All categories</option>
          {TOPIC_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading experience records...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
          <Brain className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No records match this filter</p>
          <p className="text-xs text-slate-500 mt-1">Run interviews and re-index to populate the vault</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const expanded = expandedId === item.id;
            const notes = draftNotes[item.id] ?? item.reviewNotes ?? "";

            return (
              <li key={item.id} className={`${glassCard} rounded-xl border border-white/5 overflow-hidden`}>
                <div className="p-4">
                  <div className="flex flex-wrap items-start gap-2 mb-2">
                    <span
                      className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${statusStyles(item.reviewStatus)}`}
                    >
                      {REVIEW_STATUS_LABELS[item.reviewStatus]}
                    </span>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {item.sourceKind.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950/50 text-indigo-300 border border-indigo-900/40">
                      {topicCategoryLabel(item.topicCategory)}
                    </span>
                    {item.participant && (
                      <span className="text-[10px] text-slate-500">{item.participant}</span>
                    )}
                    <span className="text-[10px] text-slate-600 ml-auto">
                      {item.charCount.toLocaleString()} chars
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-200">{item.sourceLabel}</p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed whitespace-pre-wrap">
                    {expanded ? item.content : item.preview}
                  </p>

                  {item.content.length > 280 && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                      className="text-xs text-slate-500 hover:text-slate-300 mt-2 flex items-center gap-1"
                    >
                      {expanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" /> Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" /> Show full text
                        </>
                      )}
                    </button>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => updateReview(item.id, { reviewStatus: REVIEW_STATUS.VALIDATED })}
                      className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-700/40 hover:bg-emerald-600/30 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Validate
                    </button>
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() =>
                        updateReview(item.id, { reviewStatus: REVIEW_STATUS.NEEDS_ATTENTION })
                      }
                      className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-700/40 hover:bg-amber-600/30 disabled:opacity-50"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      Needs attention
                    </button>
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => updateReview(item.id, { reviewStatus: REVIEW_STATUS.REJECTED })}
                      className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-600/20 text-red-300 border border-red-700/40 hover:bg-red-600/30 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => updateReview(item.id, { reviewStatus: REVIEW_STATUS.PENDING })}
                      className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1.5"
                    >
                      Reset
                    </button>
                    {item.sessionId && (
                      <button
                        type="button"
                        onClick={() => onOpenSession(item.sessionId!)}
                        className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 ml-auto"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View interview
                      </button>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={item.topicCategory}
                      onChange={(e) =>
                        updateReview(item.id, { topicCategory: e.target.value })
                      }
                      disabled={savingId === item.id}
                      className="text-xs bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-300"
                    >
                      {TOPIC_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) =>
                          setDraftNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder="Reviewer notes (corrections, context...)"
                        className="flex-1 text-xs bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-300 placeholder:text-slate-600"
                      />
                      <button
                        type="button"
                        disabled={savingId === item.id}
                        onClick={() => updateReview(item.id, { reviewNotes: notes })}
                        className="text-xs px-3 py-2 rounded-lg border border-white/10 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
        <p className="text-xs font-medium text-slate-400 mb-2">Export options for AIML pipeline</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["validated", "Validated only (recommended)"],
              ["needs_attention", "Needs attention"],
              ["pending", "Pending review"],
              ["all", "All experience data"],
            ] as const
          ).map(([filter, label]) => (
            <button
              key={filter}
              type="button"
              onClick={() => downloadExport("xlsx", filter)}
              disabled={!!exporting}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ExportHistoryPanel
        companyId={companyId}
        glassCard={glassCard}
        refreshKey={exportHistoryKey}
      />
    </div>
  );
}
