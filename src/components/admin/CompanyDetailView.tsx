"use client";

import { useState, useEffect, useCallback } from "react";
import ExperienceVaultPanel from "@/components/admin/ExperienceVaultPanel";
import {
  FileSpreadsheet,
  FileText,
  Database,
  Download,
  Upload,
  ChevronRight,
  MessageSquare,
  AlertTriangle,
  ListChecks,
  Link2,
  BarChart3,
  Loader2,
  Paperclip,
  Brain,
  Sparkles,
  Users,
  RefreshCw,
  BookOpen,
  Layers,
  Megaphone,
  ShieldCheck,
} from "lucide-react";
import CampaignsPanel from "@/components/admin/CampaignsPanel";
import AnswerReviewPanel from "@/components/admin/AnswerReviewPanel";
import InterviewAnalyticsPanel from "@/components/admin/InterviewAnalyticsPanel";
import ExportHistoryPanel from "@/components/admin/ExportHistoryPanel";
import RegistrationPolicyPanel from "@/components/admin/RegistrationPolicyPanel";
import ReferenceKnowledgePanel from "@/components/admin/ReferenceKnowledgePanel";
import { useReindexJob } from "@/hooks/use-reindex-job";

interface CompanyRow {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  industry: string | null;
  description: string | null;
  aiContext: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  location: string | null;
  interviewLink: string;
  sessionCount: number;
  completedCount: number;
  createdAt: string;
}

interface SessionRow {
  id: string;
  status: string;
  completionPct: number;
  language: string;
  startedAt: string;
  participant: {
    fullName: string | null;
    department: string | null;
    designation: string | null;
    mobile: string | null;
    email: string | null;
  } | null;
  hasReport: boolean;
}

interface ReferenceFile {
  id: string;
  fileName: string;
  fileType: string;
  category: string;
  fileSize: number;
  sheetCount: number;
  rowCount: number;
  description: string | null;
  importedAt: string;
}

interface ReferencePdf {
  id: string;
  fileName: string;
  pageCount: number;
  summary: string | null;
  createdAt: string;
}

interface ReferenceInsight {
  id: string;
  category: string;
  title: string;
  content: string;
  priority: string;
}

interface ReferenceData {
  files: ReferenceFile[];
  pdfs: ReferencePdf[];
  insights: ReferenceInsight[];
  furnaceSpecs: { id: string; furnaceNumber: string; parameter: string; value: string }[];
  stats: { fileCount: number; recordCount: number; insightCount: number; specCount: number };
}

interface KnowledgeChunkPreview {
  id: string;
  sourceKind: string;
  sourceLabel: string;
  preview: string;
  charCount: number;
  updatedAt: string;
}

interface KnowledgeData {
  stats: {
    reference: number;
    experience: number;
    total: number;
    lastIndexedAt: string | null;
    byKind: Record<string, number>;
    review?: {
      pending: number;
      validated: number;
      needsAttention: number;
      rejected: number;
    };
    validatedByCategory?: Record<string, number>;
  };
  referencePreview: KnowledgeChunkPreview[];
  experiencePreview: KnowledgeChunkPreview[];
}

interface GatheredAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  messageId: string | null;
  extractedTextPreview: string;
  createdAt: string;
}

interface GatheredSession {
  id: string;
  status: string;
  completionPct: number;
  language: string;
  startedAt: string;
  completedAt: string | null;
  participant: SessionRow["participant"];
  counts: {
    messages: number;
    processes: number;
    painPoints: number;
    requirements: number;
    integrations: number;
    reporting: number;
    approvals: number;
    attachments: number;
  };
  processes: { id: string; processName: string; objective: string | null }[];
  painPoints: { id: string; title: string; severity: string }[];
  requirements: { id: string; title: string; type: string; priority: string }[];
  integrations: { id: string; systemName: string }[];
  attachments: GatheredAttachment[];
  report: {
    executiveSummary: string;
    recommendations: string;
    actionItems: string;
  } | null;
}

interface GatheredData {
  sessions: GatheredSession[];
  totals: {
    sessions: number;
    completed: number;
    processes: number;
    painPoints: number;
    requirements: number;
    integrations: number;
    reports: number;
    attachments: number;
  };
}

type TabId = "overview" | "reference" | "experience" | "interviews" | "campaigns" | "quality" | "analytics";

interface CompanyDetailViewProps {
  company: CompanyRow;
  sessions: SessionRow[];
  glassPanel: string;
  glassCard: string;
  copied: boolean;
  showRegenerateConfirm: boolean;
  regenerating: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopyLink: (link: string) => void;
  onRegenerateConfirm: () => void;
  onRegenerateCancel: () => void;
  onRegenerate: () => void;
  onOpenSession: (sessionId: string) => void;
  onRefresh: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatCard({
  label,
  value,
  sub,
  accent = "amber",
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "amber" | "indigo" | "emerald" | "sky";
}) {
  const colors = {
    amber: "text-amber-400 border-amber-500/20 bg-amber-500/5",
    indigo: "text-indigo-400 border-indigo-500/20 bg-indigo-500/5",
    emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    sky: "text-sky-400 border-sky-500/20 bg-sky-500/5",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${colors[accent]}`}>
      <p className={`text-2xl font-bold tabular-nums ${colors[accent].split(" ")[0]}`}>{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  return (
    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5">
      {kind.replace(/_/g, " ")}
    </span>
  );
}

const TABS: { id: TabId; label: string; icon: typeof Database }[] = [
  { id: "overview", label: "Overview", icon: Layers },
  { id: "reference", label: "Reference Knowledge", icon: BookOpen },
  { id: "experience", label: "Experience Vault & ML", icon: Brain },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "quality", label: "Data Quality", icon: ShieldCheck },
  { id: "interviews", label: "Live Interviews", icon: Users },
];

export default function CompanyDetailView({
  company,
  sessions,
  glassPanel,
  glassCard,
  copied,
  showRegenerateConfirm,
  regenerating,
  onBack,
  onEdit,
  onDelete,
  onCopyLink,
  onRegenerateConfirm,
  onRegenerateCancel,
  onRegenerate,
  onOpenSession,
  onRefresh,
}: CompanyDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [reference, setReference] = useState<ReferenceData | null>(null);
  const [gathered, setGathered] = useState<GatheredData | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeData | null>(null);
  const [loadingRef, setLoadingRef] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingKnowledge, setLoadingKnowledge] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportHistoryKey, setExportHistoryKey] = useState(0);
  const { startReindex, running: reindexing, statusMessage: reindexStatus } =
    useReindexJob(company.id);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const loadReference = useCallback(async () => {
    setLoadingRef(true);
    try {
      const res = await fetch(`/api/reference?companySlug=${encodeURIComponent(company.slug)}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) setReference(data);
    } finally {
      setLoadingRef(false);
    }
  }, [company.slug]);

  const loadGathered = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/companies/${company.id}/gathered-data`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) setGathered(data);
    } finally {
      setLoadingData(false);
    }
  }, [company.id]);

  const loadKnowledge = useCallback(async () => {
    setLoadingKnowledge(true);
    try {
      const res = await fetch(`/api/companies/${company.id}/knowledge?preview=20`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) setKnowledge(data);
    } finally {
      setLoadingKnowledge(false);
    }
  }, [company.id]);

  useEffect(() => {
    loadReference();
    loadGathered();
    loadKnowledge();
  }, [loadReference, loadGathered, loadKnowledge]);

  async function exportExcel() {
    setExporting(true);
    try {
      const res = await fetch(`/api/companies/${company.id}/export`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Export failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      const fileName = match?.[1] ?? `${company.slug}-interview-data.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setExportHistoryKey((k) => k + 1);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to export");
    } finally {
      setExporting(false);
    }
  }

  async function reindexKnowledge(scope: "all" | "reference" | "experience" = "all") {
    try {
      await startReindex(scope);
      await loadKnowledge();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Reindex failed");
    }
  }

  async function refreshReferenceData() {
    await Promise.all([loadReference(), loadKnowledge()]);
    onRefresh();
  }

  const completedCount = gathered?.totals.completed ?? company.completedCount;
  const activeCount = (gathered?.totals.sessions ?? sessions.length) - completedCount;

  return (
    <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-white transition-colors">
          ← Back to dashboard
        </button>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="text-sm border border-white/10 bg-slate-900/40 backdrop-blur-sm px-3 py-2 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            Edit Company
          </button>
          <button
            onClick={onDelete}
            className="text-sm text-red-400 border border-red-900/50 px-3 py-2 rounded-lg hover:bg-red-950/40 transition-colors"
          >
            Delete Company
          </button>
        </div>
      </div>

      {/* Header */}
      <div className={`${glassPanel} rounded-2xl p-5 sm:p-6 border border-white/5`}>
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              {company.category && (
                <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  {company.category}
                </span>
              )}
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Tacit knowledge capture
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-2 tracking-tight">{company.name}</h2>
            <p className="text-sm text-slate-400 mt-1">
              {[company.industry, company.location].filter(Boolean).join(" · ")}
            </p>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed border-l-2 border-amber-500/40 pl-3">
              Capture 5–20 years of operational expertise that lives only in people&apos;s heads — through guided
              AI interviews, then index it for search and smarter follow-up questions.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <StatCard label="Interviews" value={sessions.length} accent="amber" />
            <StatCard label="Active" value={activeCount} accent="sky" />
            <StatCard label="Completed" value={completedCount} accent="emerald" />
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-slate-950/60 border border-white/5 p-4">
          <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Employee interview link</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={company.interviewLink}
              className="flex-1 bg-transparent text-sm text-amber-400/90 truncate outline-none font-mono"
            />
            <div className="flex gap-2 shrink-0">
              <a
                href={company.interviewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-white/10 text-slate-200 font-medium px-4 py-2 rounded-lg text-sm text-center hover:bg-slate-800/60"
              >
                Open
              </a>
              <button
                onClick={() => onCopyLink(company.interviewLink)}
                className="bg-amber-500 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-400 transition-colors"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </div>
          <div className="mt-3">
            {!showRegenerateConfirm ? (
              <button
                type="button"
                onClick={onRegenerateConfirm}
                className="text-xs text-slate-500 hover:text-amber-400 underline"
              >
                Regenerate link (invalidates old URLs)
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-xs bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2">
                <span className="text-amber-200">Old interview links will stop working.</span>
                <button
                  onClick={onRegenerate}
                  disabled={regenerating}
                  className="text-amber-400 font-semibold hover:underline disabled:opacity-50"
                >
                  {regenerating ? "..." : "Confirm"}
                </button>
                <button onClick={onRegenerateCancel} className="text-slate-400 hover:text-white">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {company.description && (
          <p className="text-sm text-slate-400 mt-4 leading-relaxed">{company.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-950/50 border border-white/5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <section className={`${glassPanel} rounded-2xl p-5 border border-white/5`}>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold">Reference knowledge (for AI questions)</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Imported Excel, PDF, and operational documents — used to ask accurate, context-aware interview
              questions.
            </p>
            {loadingRef || loadingKnowledge ? (
              <div className="flex items-center text-slate-500 py-8">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Source files" value={reference?.stats.fileCount ?? 0} accent="indigo" />
                <StatCard label="Data rows" value={reference?.stats.recordCount ?? 0} accent="indigo" />
                <StatCard label="Documents" value={reference?.pdfs.length ?? 0} accent="indigo" />
                <StatCard
                  label="Indexed chunks"
                  value={knowledge?.stats.reference ?? 0}
                  accent="indigo"
                  sub="RAG-ready"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("reference")}
              className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Manage reference data →
            </button>
          </section>

          <section className={`${glassPanel} rounded-2xl p-5 border border-white/5`}>
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold">Experience vault (from interviews)</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Tacit knowledge extracted from employee conversations — segregated from reference data and indexed
              separately.
            </p>
            {loadingData || loadingKnowledge ? (
              <div className="flex items-center text-slate-500 py-8">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Sessions" value={gathered?.totals.sessions ?? 0} accent="emerald" />
                <StatCard label="Pending review" value={knowledge?.stats.review?.pending ?? 0} accent="emerald" />
                <StatCard label="Validated" value={knowledge?.stats.review?.validated ?? 0} accent="emerald" />
                <StatCard
                  label="Needs attention"
                  value={knowledge?.stats.review?.needsAttention ?? 0}
                  accent="emerald"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("experience")}
              className="mt-4 text-sm text-emerald-400 hover:text-emerald-300 font-medium"
            >
              View experience vault →
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("quality")}
              className="mt-4 text-sm text-sky-400 hover:text-sky-300 font-medium"
            >
              Review answer quality →
            </button>
          </section>

          <section className={`lg:col-span-2 ${glassPanel} rounded-2xl p-5 border border-white/5`}>
            <RegistrationPolicyPanel companyId={company.id} glassCard={glassCard} />
          </section>

          <section className={`lg:col-span-2 ${glassPanel} rounded-2xl p-5 border border-white/5`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold">Knowledge index</h3>
              </div>
              <button
                type="button"
                onClick={() => reindexKnowledge("all")}
                disabled={reindexing}
                className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-50 px-3 py-2 rounded-lg border border-white/10 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${reindexing ? "animate-spin" : ""}`} />
                {reindexing ? "Indexing..." : "Rebuild knowledge index"}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Chunks power interactive interview questions via retrieval-augmented generation. Rebuild after
              imports or when interviews complete.
            </p>
            {reindexStatus && (
              <p className="text-xs text-amber-400/90 mb-3">{reindexStatus}</p>
            )}
            {knowledge ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-4 text-sm">
                  <p>
                    <span className="text-slate-500">Total chunks:</span>{" "}
                    <span className="font-semibold text-white">{knowledge.stats.total}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Reference:</span>{" "}
                    <span className="text-indigo-400 font-medium">{knowledge.stats.reference}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Experience:</span>{" "}
                    <span className="text-emerald-400 font-medium">{knowledge.stats.experience}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Validated for ML:</span>{" "}
                    <span className="text-emerald-400 font-medium">
                      {knowledge.stats.review?.validated ?? 0}
                    </span>
                  </p>
                  <p>
                    <span className="text-slate-500">Last indexed:</span>{" "}
                    <span className="text-slate-300">
                      {knowledge.stats.lastIndexedAt
                        ? new Date(knowledge.stats.lastIndexedAt).toLocaleString()
                        : "Not yet indexed — click Rebuild"}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Knowledge index not loaded.</p>
            )}
          </section>
        </div>
      )}

      {/* Reference tab */}
      {activeTab === "reference" && (
        <ReferenceKnowledgePanel
          companyId={company.id}
          reference={reference}
          knowledgeStats={
            knowledge
              ? {
                  reference: knowledge.stats.reference,
                  lastIndexedAt: knowledge.stats.lastIndexedAt,
                }
              : null
          }
          referencePreview={knowledge?.referencePreview ?? []}
          loadingRef={loadingRef}
          loadingKnowledge={loadingKnowledge}
          reindexing={reindexing}
          reindexStatus={reindexStatus}
          onRefresh={refreshReferenceData}
          onReindex={() => reindexKnowledge("reference")}
        />
      )}

      {/* Experience tab */}
      {activeTab === "experience" && (
        <div className={`${glassPanel} rounded-2xl p-5 border border-white/5`}>
          <ExperienceVaultPanel
            companyId={company.id}
            companySlug={company.slug}
            glassCard={glassCard}
            gatheredTotals={
              gathered
                ? {
                    sessions: gathered.totals.sessions,
                    completed: gathered.totals.completed,
                    painPoints: gathered.totals.painPoints,
                    reports: gathered.totals.reports,
                  }
                : undefined
            }
            onOpenSession={onOpenSession}
            onReindexComplete={loadKnowledge}
          />
        </div>
      )}

      {/* Campaigns tab */}
      {activeTab === "campaigns" && (
        <div className={`${glassPanel} rounded-2xl p-5 border border-white/5`}>
          <CampaignsPanel
            companyId={company.id}
            glassCard={glassCard}
            onCopyLink={onCopyLink}
          />
        </div>
      )}

      {/* Analytics tab */}
      {activeTab === "analytics" && (
        <div className={`${glassPanel} rounded-2xl p-5 border border-white/5`}>
          <InterviewAnalyticsPanel companyId={company.id} glassCard={glassCard} />
        </div>
      )}

      {/* Data quality tab */}
      {activeTab === "quality" && (
        <div className={`${glassPanel} rounded-2xl p-5 border border-white/5`}>
          <AnswerReviewPanel companyId={company.id} glassCard={glassCard} />
        </div>
      )}

      {/* Interviews tab */}
      {activeTab === "interviews" && (
        <section className={`${glassPanel} rounded-2xl flex flex-col overflow-hidden border border-white/5`}>
          <div className="p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-lg">Live Interviews</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Track sessions, structured outputs, and export collected data
              </p>
            </div>
            <button
              onClick={exportExcel}
              disabled={exporting || !gathered?.totals.sessions}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? "Exporting..." : "Export to Excel"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loadingData ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading interview data...
              </div>
            ) : gathered ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  <StatCard label="Sessions" value={gathered.totals.sessions} accent="amber" />
                  <StatCard label="Completed" value={gathered.totals.completed} accent="emerald" />
                  <StatCard label="Processes" value={gathered.totals.processes} accent="amber" />
                  <StatCard label="Pain pts" value={gathered.totals.painPoints} accent="amber" />
                  <StatCard label="Reqs" value={gathered.totals.requirements} accent="amber" />
                  <StatCard label="Files" value={gathered.totals.attachments} accent="amber" />
                  <StatCard label="Reports" value={gathered.totals.reports} accent="amber" />
                </div>

                {gathered.sessions.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
                    <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No interviews yet</p>
                    <p className="text-xs text-slate-500 mt-1">Share the employee link to start capturing knowledge</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {gathered.sessions.map((s) => {
                      const expanded = expandedSession === s.id;
                      const hasStructured =
                        s.counts.processes > 0 ||
                        s.counts.painPoints > 0 ||
                        s.counts.requirements > 0 ||
                        s.counts.integrations > 0 ||
                        s.counts.attachments > 0 ||
                        !!s.report;

                      return (
                        <div key={s.id} className={`${glassCard} rounded-xl overflow-hidden border border-white/5`}>
                          <button
                            type="button"
                            onClick={() => setExpandedSession(expanded ? null : s.id)}
                            className="w-full text-left p-4 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold">{s.participant?.fullName ?? "Anonymous"}</p>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${
                                    s.status === "completed"
                                      ? "bg-green-950/80 text-green-400"
                                      : "bg-slate-800 text-slate-400"
                                  }`}
                                >
                                  {s.status}
                                </span>
                                {s.report && <span className="text-[10px] text-green-500">Report ✓</span>}
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {[s.participant?.designation, s.participant?.department, s.participant?.mobile]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                              <p className="text-[10px] text-slate-600 mt-1">
                                {new Date(s.startedAt).toLocaleString()} · {s.language.toUpperCase()} ·{" "}
                                {s.completionPct}% complete
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {s.counts.messages > 0 && (
                                  <span className="text-[10px] bg-slate-800/80 px-2 py-0.5 rounded flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" /> {s.counts.messages} msgs
                                  </span>
                                )}
                                {s.counts.painPoints > 0 && (
                                  <span className="text-[10px] bg-red-950/50 text-red-300 px-2 py-0.5 rounded flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> {s.counts.painPoints}
                                  </span>
                                )}
                                {s.counts.requirements > 0 && (
                                  <span className="text-[10px] bg-blue-950/50 text-blue-300 px-2 py-0.5 rounded flex items-center gap-1">
                                    <ListChecks className="w-3 h-3" /> {s.counts.requirements}
                                  </span>
                                )}
                                {s.counts.integrations > 0 && (
                                  <span className="text-[10px] bg-purple-950/50 text-purple-300 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Link2 className="w-3 h-3" /> {s.counts.integrations}
                                  </span>
                                )}
                                {s.counts.attachments > 0 && (
                                  <span className="text-[10px] bg-amber-950/50 text-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Paperclip className="w-3 h-3" /> {s.counts.attachments}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight
                              className={`w-5 h-5 text-slate-500 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
                            />
                          </button>

                          {expanded && (
                            <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                              {s.report && (
                                <div className="rounded-lg bg-slate-950/50 p-3 border border-green-900/30">
                                  <p className="text-xs font-medium text-green-400 mb-2">Executive Summary</p>
                                  <p className="text-xs text-slate-300 line-clamp-4 whitespace-pre-wrap">
                                    {s.report.executiveSummary}
                                  </p>
                                </div>
                              )}
                              {s.painPoints.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Pain Points</p>
                                  <ul className="space-y-1">
                                    {s.painPoints.map((p) => (
                                      <li key={p.id} className="text-xs text-slate-300 flex gap-2">
                                        <span className="text-red-400 shrink-0">•</span>
                                        <span>
                                          {p.title} <span className="text-slate-600">({p.severity})</span>
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {s.requirements.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Requirements</p>
                                  <ul className="space-y-1">
                                    {s.requirements.map((r) => (
                                      <li key={r.id} className="text-xs text-slate-300 flex gap-2">
                                        <span className="text-blue-400 shrink-0">•</span>
                                        <span>
                                          {r.title} <span className="text-slate-600">[{r.type}]</span>
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {s.processes.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Processes</p>
                                  <ul className="space-y-1">
                                    {s.processes.map((p) => (
                                      <li key={p.id} className="text-xs text-slate-300">
                                        • {p.processName}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {s.attachments.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-2">Uploaded Files</p>
                                  <ul className="space-y-2">
                                    {s.attachments.map((a) => (
                                      <li
                                        key={a.id}
                                        className="text-xs rounded-lg border border-white/10 bg-slate-950/40 p-2.5"
                                      >
                                        <a
                                          href={a.filePath}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-amber-400 hover:text-amber-300 font-medium truncate block"
                                        >
                                          {a.fileName}
                                        </a>
                                        {a.extractedTextPreview && (
                                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                            {a.extractedTextPreview}
                                          </p>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {!hasStructured && (
                                <p className="text-xs text-slate-500 italic">
                                  Interview in progress — structured data appears as the conversation continues.
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenSession(s.id)}
                                className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                              >
                                View full conversation &amp; report →
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <ExportHistoryPanel
                  companyId={company.id}
                  glassCard={glassCard}
                  refreshKey={exportHistoryKey}
                />
              </>
            ) : (
              <p className="text-sm text-red-400">Failed to load interview data</p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
