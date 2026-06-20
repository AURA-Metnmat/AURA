"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

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

interface CompanyDetailViewProps {
  company: CompanyRow;
  sessions: SessionRow[];
  glassPanel: string;
  glassCard: string;
  copied: boolean;
  uploading: boolean;
  showRegenerateConfirm: boolean;
  regenerating: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopyLink: (link: string) => void;
  onRegenerateConfirm: () => void;
  onRegenerateCancel: () => void;
  onRegenerate: () => void;
  onUploadReference: (slug: string, files: FileList | null) => void | Promise<void>;
  onOpenSession: (sessionId: string) => void;
  onRefresh: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-950/50 border border-white/5 px-3 py-2 text-center min-w-[72px]">
      <p className="text-lg font-bold text-amber-400">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

export default function CompanyDetailView({
  company,
  sessions,
  glassPanel,
  glassCard,
  copied,
  uploading,
  showRegenerateConfirm,
  regenerating,
  onBack,
  onEdit,
  onDelete,
  onCopyLink,
  onRegenerateConfirm,
  onRegenerateCancel,
  onRegenerate,
  onUploadReference,
  onOpenSession,
  onRefresh,
}: CompanyDetailViewProps) {
  const [reference, setReference] = useState<ReferenceData | null>(null);
  const [gathered, setGathered] = useState<GatheredData | null>(null);
  const [loadingRef, setLoadingRef] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [exporting, setExporting] = useState(false);
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

  useEffect(() => {
    loadReference();
    loadGathered();
  }, [loadReference, loadGathered]);

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
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to export");
    } finally {
      setExporting(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    await onUploadReference(company.slug, e.target.files);
    e.target.value = "";
    await loadReference();
    onRefresh();
  }

  return (
    <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button onClick={onBack} className="text-sm text-slate-400 hover:text-white transition-colors">
          ← Back to dashboard
        </button>
        <div className="flex gap-2">
          <button onClick={onEdit} className="text-sm border border-white/10 bg-slate-900/40 backdrop-blur-sm px-3 py-2 rounded-lg hover:bg-slate-800/60 transition-colors">
            Edit Company
          </button>
          <button onClick={onDelete} className="text-sm text-red-400 border border-red-900/50 px-3 py-2 rounded-lg hover:bg-red-950/40 transition-colors">
            Delete Company
          </button>
        </div>
      </div>

      <div className={`${glassPanel} rounded-2xl p-5 sm:p-6`}>
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">{company.category}</span>
            <h2 className="text-2xl font-bold mt-2">{company.name}</h2>
            <p className="text-sm text-slate-400 mt-1">
              {[company.industry, company.location].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-amber-400">{sessions.length}</p>
            <p className="text-xs text-slate-500">total interviews</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-slate-950/50 border border-white/5 p-4">
          <p className="text-xs text-slate-500 mb-2">Employee Interview Link</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input readOnly value={company.interviewLink} className="flex-1 bg-transparent text-sm text-amber-400 truncate outline-none" />
            <div className="flex gap-2 shrink-0">
              <a href={company.interviewLink} target="_blank" rel="noopener noreferrer" className="border border-white/10 text-slate-200 font-semibold px-4 py-2 rounded-lg text-sm text-center hover:bg-slate-800/60">
                Open
              </a>
              <button onClick={() => onCopyLink(company.interviewLink)} className="bg-amber-500 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <div className="mt-3">
            {!showRegenerateConfirm ? (
              <button type="button" onClick={onRegenerateConfirm} className="text-xs text-slate-400 hover:text-amber-400 underline">
                Regenerate link (invalidates old URLs)
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-xs bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2">
                <span className="text-amber-200">Old interview links will stop working.</span>
                <button onClick={onRegenerate} disabled={regenerating} className="text-amber-400 font-semibold hover:underline disabled:opacity-50">
                  {regenerating ? "..." : "Confirm"}
                </button>
                <button onClick={onRegenerateCancel} className="text-slate-400 hover:text-white">Cancel</button>
              </div>
            )}
          </div>
        </div>

        {company.description && (
          <p className="text-sm text-slate-400 mt-4 leading-relaxed">{company.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[520px]">
        {/* Left — Reference Data */}
        <aside className={`lg:col-span-4 xl:col-span-4 ${glassPanel} rounded-2xl flex flex-col overflow-hidden`}>
          <div className="p-5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-lg">Reference Data</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">Imported Excel, PDF & operational context for AI</p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {loadingRef ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading reference data...
              </div>
            ) : reference ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <StatPill label="Files" value={reference.stats.fileCount} />
                  <StatPill label="Records" value={reference.stats.recordCount} />
                  <StatPill label="PDFs" value={reference.pdfs.length} />
                  <StatPill label="Insights" value={reference.stats.insightCount} />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Uploaded Files</p>
                  {reference.files.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-white/10 rounded-xl">
                      No reference files yet
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {reference.files.map((f) => (
                        <li key={f.id} className={`${glassCard} rounded-xl p-3`}>
                          <div className="flex items-start gap-3">
                            <FileSpreadsheet className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{f.fileName}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {f.category.replace(/_/g, " ")} · {f.sheetCount} sheet{f.sheetCount !== 1 ? "s" : ""} · {f.rowCount.toLocaleString()} rows
                              </p>
                              <p className="text-[10px] text-slate-600 mt-1">
                                {formatBytes(f.fileSize)} · {new Date(f.importedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {reference.pdfs.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">PDF Documents</p>
                    <ul className="space-y-2">
                      {reference.pdfs.map((p) => (
                        <li key={p.id} className={`${glassCard} rounded-xl p-3`}>
                          <div className="flex items-start gap-3">
                            <FileText className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{p.fileName}</p>
                              <p className="text-xs text-slate-500">{p.pageCount} pages</p>
                              {p.summary && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.summary}</p>}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {reference.insights.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Data Insights</p>
                    <ul className="space-y-2">
                      {reference.insights.slice(0, 8).map((ins) => (
                        <li key={ins.id} className="rounded-xl p-3 bg-slate-950/40 border border-white/5">
                          <p className="text-sm font-medium text-indigo-300">{ins.title}</p>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ins.content}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {reference.furnaceSpecs.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Furnace Specs ({reference.furnaceSpecs.length})</p>
                    <p className="text-xs text-slate-400">Structured parameters imported from reference Excel.</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-red-400">Failed to load reference data</p>
            )}
          </div>

          <div className="p-5 border-t border-white/10 shrink-0">
            <label className="flex items-center justify-center gap-2 w-full cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium rounded-xl py-3 text-sm transition-colors">
              <Upload className="w-4 h-4" />
              {uploading ? "Uploading..." : "Import Excel / PDF"}
              <input
                type="file"
                multiple
                accept=".xlsx,.xls,.pdf"
                disabled={uploading}
                onChange={handleUpload}
                className="hidden"
              />
            </label>
          </div>
        </aside>

        {/* Right — Interview Gathered Data */}
        <section className={`lg:col-span-8 xl:col-span-8 ${glassPanel} rounded-2xl flex flex-col overflow-hidden`}>
          <div className="p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-lg">Interview Gathered Data</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">Requirements, pain points, processes, file uploads & reports from employee interviews</p>
            </div>
            <button
              onClick={exportExcel}
              disabled={exporting || !gathered?.totals.sessions}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-lg text-sm shadow-lg shadow-emerald-900/30 transition-colors"
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
                <div className="flex flex-wrap gap-2">
                  <StatPill label="Sessions" value={gathered.totals.sessions} />
                  <StatPill label="Completed" value={gathered.totals.completed} />
                  <StatPill label="Processes" value={gathered.totals.processes} />
                  <StatPill label="Pain Pts" value={gathered.totals.painPoints} />
                  <StatPill label="Requirements" value={gathered.totals.requirements} />
                  <StatPill label="Files" value={gathered.totals.attachments} />
                  <StatPill label="Reports" value={gathered.totals.reports} />
                </div>

                {gathered.sessions.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
                    <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No interviews yet</p>
                    <p className="text-xs text-slate-500 mt-1">Share the employee link to start gathering data</p>
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
                        <div key={s.id} className={`${glassCard} rounded-xl overflow-hidden`}>
                          <button
                            type="button"
                            onClick={() => setExpandedSession(expanded ? null : s.id)}
                            className="w-full text-left p-4 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold">{s.participant?.fullName ?? "Anonymous"}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${s.status === "completed" ? "bg-green-950/80 text-green-400" : "bg-slate-800 text-slate-400"}`}>
                                  {s.status}
                                </span>
                                {s.report && <span className="text-[10px] text-green-500">Report ✓</span>}
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {[s.participant?.designation, s.participant?.department, s.participant?.mobile].filter(Boolean).join(" · ")}
                              </p>
                              <p className="text-[10px] text-slate-600 mt-1">
                                {new Date(s.startedAt).toLocaleString()} · {s.language.toUpperCase()} · {s.completionPct}% complete
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {s.counts.messages > 0 && (
                                  <span className="text-[10px] bg-slate-800/80 px-2 py-0.5 rounded flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" /> {s.counts.messages} msgs
                                  </span>
                                )}
                                {s.counts.painPoints > 0 && (
                                  <span className="text-[10px] bg-red-950/50 text-red-300 px-2 py-0.5 rounded flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> {s.counts.painPoints} pain pts
                                  </span>
                                )}
                                {s.counts.requirements > 0 && (
                                  <span className="text-[10px] bg-blue-950/50 text-blue-300 px-2 py-0.5 rounded flex items-center gap-1">
                                    <ListChecks className="w-3 h-3" /> {s.counts.requirements} reqs
                                  </span>
                                )}
                                {s.counts.integrations > 0 && (
                                  <span className="text-[10px] bg-purple-950/50 text-purple-300 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Link2 className="w-3 h-3" /> {s.counts.integrations} integrations
                                  </span>
                                )}
                                {s.counts.attachments > 0 && (
                                  <span className="text-[10px] bg-amber-950/50 text-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Paperclip className="w-3 h-3" /> {s.counts.attachments} files
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className={`w-5 h-5 text-slate-500 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
                          </button>

                          {expanded && (
                            <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                              {s.report && (
                                <div className="rounded-lg bg-slate-950/50 p-3 border border-green-900/30">
                                  <p className="text-xs font-medium text-green-400 mb-2">Executive Summary</p>
                                  <p className="text-xs text-slate-300 line-clamp-4 whitespace-pre-wrap">{s.report.executiveSummary}</p>
                                </div>
                              )}
                              {s.painPoints.length > 0 && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Pain Points</p>
                                  <ul className="space-y-1">
                                    {s.painPoints.map((p) => (
                                      <li key={p.id} className="text-xs text-slate-300 flex gap-2">
                                        <span className="text-red-400 shrink-0">•</span>
                                        <span>{p.title} <span className="text-slate-600">({p.severity})</span></span>
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
                                        <span>{r.title} <span className="text-slate-600">[{r.type}]</span></span>
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
                                      <li key={p.id} className="text-xs text-slate-300">• {p.processName}</li>
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
                                        <div className="flex items-start justify-between gap-2">
                                          <a
                                            href={a.filePath}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-amber-400 hover:text-amber-300 font-medium truncate"
                                          >
                                            {a.fileName}
                                          </a>
                                          <span className="text-slate-600 shrink-0">{formatBytes(a.fileSize)}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-600 mt-1">
                                          {a.fileType} · {new Date(a.createdAt).toLocaleString()}
                                        </p>
                                        {a.extractedTextPreview && (
                                          <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">
                                            {a.extractedTextPreview}
                                          </p>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {!hasStructured && (
                                <p className="text-xs text-slate-500 italic">Interview in progress — structured data will appear as the conversation continues.</p>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenSession(s.id)}
                                className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                              >
                                View full conversation & report →
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-red-400">Failed to load interview data</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
