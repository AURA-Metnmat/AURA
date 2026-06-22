"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Copy,
  Link2,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Trash2,
  ChevronUp,
  ChevronDown,
  BookMarked,
} from "lucide-react";

interface CampaignRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  effectiveStatus: "active" | "expired" | "revoked";
  inviteToken: string | null;
  interviewLink: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  isDefault: boolean;
  questionCount: number;
  sessionCount: number;
}

interface BankQuestion {
  id: string;
  title: string;
  section: string | null;
  category: string | null;
  isActive: boolean;
  currentVersion: {
    id: string;
    version: number;
    promptEn: string;
    promptLocale: string | null;
    section: string | null;
  } | null;
}

interface CampaignQuestionLink {
  id: string;
  sortOrder: number;
  section: string | null;
  questionBank: { id: string; title: string; section: string | null; category: string | null };
  version: { id: string; version: number; promptEn: string; promptLocale: string | null };
}

interface CampaignsPanelProps {
  companyId: string;
  glassCard: string;
  onCopyLink: (link: string) => void;
}

const SECTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

function statusBadge(status: CampaignRow["effectiveStatus"]) {
  const styles = {
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    expired: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    revoked: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  return (
    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function CampaignsPanel({ companyId, glassCard, onCopyLink }: CampaignsPanelProps) {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [bank, setBank] = useState<BankQuestion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [campaignQuestions, setCampaignQuestions] = useState<CampaignQuestionLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignExpiry, setNewCampaignExpiry] = useState("");

  const [newQTitle, setNewQTitle] = useState("");
  const [newQSection, setNewQSection] = useState("B");
  const [newQPrompt, setNewQPrompt] = useState("");

  const selected = campaigns.find((c) => c.id === selectedId) ?? null;

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/campaigns`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load campaigns");
      setCampaigns(data.campaigns ?? []);
      setSelectedId((prev) => prev ?? data.campaigns?.[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const loadBank = useCallback(async () => {
    const res = await fetch(`/api/companies/${companyId}/question-bank`, { credentials: "include" });
    const data = await res.json();
    if (res.ok) setBank(data.questions ?? []);
  }, [companyId]);

  const loadCampaignQuestions = useCallback(
    async (campaignId: string) => {
      setLoadingQuestions(true);
      try {
        const res = await fetch(
          `/api/companies/${companyId}/campaigns/${campaignId}/questions`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (res.ok) setCampaignQuestions(data.questions ?? []);
      } finally {
        setLoadingQuestions(false);
      }
    },
    [companyId]
  );

  useEffect(() => {
    void loadCampaigns();
    void loadBank();
  }, [loadCampaigns, loadBank]);

  useEffect(() => {
    if (selectedId) void loadCampaignQuestions(selectedId);
  }, [selectedId, loadCampaignQuestions]);

  async function createCampaign() {
    if (!newCampaignName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newCampaignName.trim(),
          expiresAt: newCampaignExpiry || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create campaign");
      setNewCampaignName("");
      setNewCampaignExpiry("");
      await loadCampaigns();
      if (data.campaign?.id) setSelectedId(data.campaign.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create campaign");
    } finally {
      setSaving(false);
    }
  }

  async function updateCampaign(patch: Record<string, unknown>) {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/campaigns/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update campaign");
      await loadCampaigns();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update campaign");
    } finally {
      setSaving(false);
    }
  }

  async function createBankQuestion() {
    if (!newQTitle.trim() || !newQPrompt.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/question-bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: newQTitle.trim(),
          section: newQSection,
          promptEn: newQPrompt.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create question");
      setNewQTitle("");
      setNewQPrompt("");
      await loadBank();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create question");
    } finally {
      setSaving(false);
    }
  }

  async function addQuestionToCampaign(bankId: string) {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/campaigns/${selectedId}/questions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ questionBankId: bankId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add question");
      await loadCampaignQuestions(selectedId);
      await loadCampaigns();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add question");
    } finally {
      setSaving(false);
    }
  }

  async function removeCampaignQuestion(linkId: string) {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/campaigns/${selectedId}/questions/${linkId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to remove question");
      }
      await loadCampaignQuestions(selectedId);
      await loadCampaigns();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove question");
    } finally {
      setSaving(false);
    }
  }

  async function moveQuestion(linkId: string, direction: "up" | "down") {
    if (!selectedId) return;
    const idx = campaignQuestions.findIndex((q) => q.id === linkId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= campaignQuestions.length) return;

    const ordered = [...campaignQuestions];
    const [item] = ordered.splice(idx, 1);
    ordered.splice(swapIdx, 0, item!);

    setSaving(true);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/campaigns/${selectedId}/questions`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orderedIds: ordered.map((q) => q.id) }),
        }
      );
      if (!res.ok) throw new Error("Failed to reorder");
      setCampaignQuestions(ordered.map((q, i) => ({ ...q, sortOrder: i })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading campaigns…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Campaign list */}
        <div className={`${glassCard} p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-400" />
              Campaigns
            </h3>
            <button
              type="button"
              onClick={() => void loadCampaigns()}
              className="text-slate-500 hover:text-slate-300"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {campaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                  selectedId === c.id
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-white/5 bg-slate-900/40 hover:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-100 truncate">{c.name}</span>
                  {statusBadge(c.effectiveStatus)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {c.questionCount} questions · {c.sessionCount} sessions
                  {c.isDefault && " · default"}
                </p>
              </button>
            ))}
          </div>

          <div className="border-t border-white/5 pt-4 space-y-2">
            <input
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
              placeholder="New campaign name"
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            />
            <input
              type="date"
              value={newCampaignExpiry}
              onChange={(e) => setNewCampaignExpiry(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            />
            <button
              type="button"
              disabled={saving || !newCampaignName.trim()}
              onClick={() => void createCampaign()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500/20 border border-amber-500/30 py-2 text-sm text-amber-200 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Create campaign
            </button>
          </div>
        </div>

        {/* Selected campaign */}
        <div className={`${glassCard} p-5 space-y-4 xl:col-span-2`}>
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">{selected.name}</h3>
                  {selected.description && (
                    <p className="text-sm text-slate-400 mt-1">{selected.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {statusBadge(selected.effectiveStatus)}
                    {selected.isDefault && (
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded-full border border-sky-500/30 text-sky-300 bg-sky-500/10">
                        default
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.interviewLink && (
                    <button
                      type="button"
                      onClick={() => onCopyLink(selected.interviewLink!)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy link
                    </button>
                  )}
                  {!selected.isDefault && selected.effectiveStatus === "active" && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void updateCampaign({ status: "revoked" })}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10"
                    >
                      Revoke
                    </button>
                  )}
                  {!selected.isDefault && selected.effectiveStatus === "revoked" && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void updateCampaign({ status: "active" })}
                      className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-300"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>

              {selected.interviewLink && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-900/50 rounded-lg px-3 py-2">
                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{selected.interviewLink}</span>
                </div>
              )}

              {selected.expiresAt && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Expires {new Date(selected.expiresAt).toLocaleDateString()}
                </p>
              )}

              <div>
                <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
                  Question sequence ({campaignQuestions.length})
                </h4>
                {loadingQuestions ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                ) : campaignQuestions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No scripted questions yet. Add from the question bank below — after intro &
                    tenure, these run before AI follow-ups.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {campaignQuestions.map((q, i) => (
                      <div
                        key={q.id}
                        className="flex gap-2 items-start rounded-xl border border-white/5 bg-slate-900/40 p-3"
                      >
                        <span className="text-xs font-mono text-amber-400/80 w-5 pt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200">{q.questionBank.title}</p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{q.version.promptEn}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={saving || i === 0}
                            onClick={() => void moveQuestion(q.id, "up")}
                            className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={saving || i === campaignQuestions.length - 1}
                            onClick={() => void moveQuestion(q.id, "down")}
                            className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void removeCampaignQuestion(q.id)}
                            className="p-1 text-red-400/70 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm">Select a campaign to manage its question sequence.</p>
          )}
        </div>
      </div>

      {/* Question bank */}
      <div className={`${glassCard} p-5 space-y-4`}>
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-indigo-400" />
          Question bank
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            value={newQTitle}
            onChange={(e) => setNewQTitle(e.target.value)}
            placeholder="Question title (internal)"
            className="md:col-span-1 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          />
          <select
            value={newQSection}
            onChange={(e) => setNewQSection(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          >
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                Section {s}
              </option>
            ))}
          </select>
          <input
            value={newQPrompt}
            onChange={(e) => setNewQPrompt(e.target.value)}
            placeholder="Question text (English)"
            className="md:col-span-2 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <button
          type="button"
          disabled={saving || !newQTitle.trim() || !newQPrompt.trim()}
          onClick={() => void createBankQuestion()}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add to question bank
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
          {bank.filter((q) => q.isActive).map((q) => (
            <div
              key={q.id}
              className="rounded-xl border border-white/5 bg-slate-900/40 p-3 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-200">{q.title}</p>
                  <p className="text-[10px] text-slate-500">
                    Section {q.section ?? "—"} · v{q.currentVersion?.version ?? 1}
                  </p>
                </div>
                {selectedId && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void addQuestionToCampaign(q.id)}
                    className="text-[11px] px-2 py-1 rounded border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 shrink-0"
                  >
                    Add to campaign
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{q.currentVersion?.promptEn}</p>
            </div>
          ))}
          {bank.length === 0 && (
            <p className="text-sm text-slate-500 col-span-2">No questions in the bank yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
