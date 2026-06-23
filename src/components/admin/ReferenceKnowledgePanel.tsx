"use client";

import { useState } from "react";
import {
  BookOpen,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  REFERENCE_FILE_CATEGORIES,
  REFERENCE_UPLOAD_ACCEPT,
  type ReferenceFileCategory,
} from "@/lib/reference/reference-categories";
import { buildReferenceUploadRequest } from "@/lib/upload/reference-upload-client";

const glassPanel = "bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20";
const glassCard = "bg-slate-900/50 backdrop-blur-md border border-white/10 hover:border-indigo-500/20 transition-colors";
const glassInput =
  "w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/60";

export interface ReferenceFileRow {
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

export interface ReferencePdfRow {
  id: string;
  fileName: string;
  pageCount: number;
  summary: string | null;
  createdAt: string;
}

export interface ReferenceData {
  files: ReferenceFileRow[];
  pdfs: ReferencePdfRow[];
  stats: {
    fileCount: number;
    recordCount: number;
    insightCount: number;
    specCount: number;
  };
}

export interface KnowledgeChunkPreview {
  id: string;
  sourceKind: string;
  sourceLabel: string;
  preview: string;
  charCount: number;
  updatedAt: string;
}

export interface ReferenceKnowledgeStats {
  reference: number;
  lastIndexedAt: string | null;
}

interface ReferenceKnowledgePanelProps {
  companyId: string;
  reference: ReferenceData | null;
  knowledgeStats: ReferenceKnowledgeStats | null;
  referencePreview: KnowledgeChunkPreview[];
  loadingRef: boolean;
  loadingKnowledge: boolean;
  reindexing: boolean;
  reindexStatus: string | null;
  onRefresh: () => Promise<void>;
  onReindex: () => Promise<void>;
}

type EditTarget =
  | { kind: "data-file"; id: string; fileName: string; category: string; description: string }
  | { kind: "document"; id: string; fileName: string; content: string; summary: string };

type DeleteTarget =
  | { kind: "data-file"; id: string; fileName: string }
  | { kind: "document"; id: string; fileName: string };

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className={`${glassCard} rounded-xl p-3 border border-white/5`}>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
            <p className="text-xl font-semibold mt-1 text-indigo-300">{value.toLocaleString()}</p>
    </div>
  );
}

export default function ReferenceKnowledgePanel({
  companyId,
  reference,
  knowledgeStats,
  referencePreview,
  loadingRef,
  loadingKnowledge,
  reindexing,
  reindexStatus,
  onRefresh,
  onReindex,
}: ReferenceKnowledgePanelProps) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  function showNotice(message: string, type: "success" | "error" = "success") {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 5000);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    e.target.value = "";
    setUploading(true);
    try {
      const fileList = Array.from(files);
      const { init } = await buildReferenceUploadRequest(fileList);
      const res = await fetch(`/api/companies/${companyId}/reference/upload`, init);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      showNotice(data.message ?? `Uploaded ${fileList.length} file(s) and synced knowledge index`);
      await onRefresh();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  async function openEditDataFile(fileId: string) {
    try {
      const res = await fetch(`/api/companies/${companyId}/reference/data-files/${fileId}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load file");
      const file = data.file as {
        fileName: string;
        category: string;
        description: string | null;
      };
      setEditTarget({
        kind: "data-file",
        id: fileId,
        fileName: file.fileName,
        category: file.category,
        description: file.description ?? "",
      });
    } catch (err) {
      showNotice(err instanceof Error ? err.message : "Failed to load file", "error");
    }
  }

  async function openEditDocument(documentId: string) {
    try {
      const res = await fetch(`/api/companies/${companyId}/reference/documents/${documentId}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load document");
      const doc = data.document as {
        fileName: string;
        content: string;
        summary: string | null;
      };
      setEditTarget({
        kind: "document",
        id: documentId,
        fileName: doc.fileName,
        content: doc.content,
        summary: doc.summary ?? "",
      });
    } catch (err) {
      showNotice(err instanceof Error ? err.message : "Failed to load document", "error");
    }
  }

  async function saveEdit() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const url =
        editTarget.kind === "data-file"
          ? `/api/companies/${companyId}/reference/data-files/${editTarget.id}`
          : `/api/companies/${companyId}/reference/documents/${editTarget.id}`;

      const body =
        editTarget.kind === "data-file"
          ? {
              fileName: editTarget.fileName,
              category: editTarget.category,
              description: editTarget.description || null,
            }
          : {
              fileName: editTarget.fileName,
              content: editTarget.content,
              summary: editTarget.summary || null,
            };

      const res = await fetch(url, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setEditTarget(null);
      showNotice("Saved and synced knowledge index");
      await onRefresh();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const url =
        deleteTarget.kind === "data-file"
          ? `/api/companies/${companyId}/reference/data-files/${deleteTarget.id}`
          : `/api/companies/${companyId}/reference/documents/${deleteTarget.id}`;

      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setDeleteTarget(null);
      showNotice(`Removed "${deleteTarget.fileName}" and synced index`);
      await onRefresh();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={`${glassPanel} rounded-2xl overflow-hidden border border-white/5`}>
      <div className="p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-lg">Reference Knowledge Base</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Upload, edit, or remove reference files — changes auto-sync to the AI interview index
          </p>
          {knowledgeStats?.lastIndexedAt && (
            <p className="text-[10px] text-slate-600 mt-1">
              Last indexed: {new Date(knowledgeStats.lastIndexedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void onReindex()}
            disabled={reindexing}
            className="flex items-center gap-2 text-sm border border-indigo-500/30 text-indigo-300 px-3 py-2 rounded-lg hover:bg-indigo-950/30 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${reindexing ? "animate-spin" : ""}`} />
            {reindexing ? "Syncing…" : "Sync index"}
          </button>
          <label className="flex items-center gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50">
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading…" : "Add files"}
            <input
              type="file"
              multiple
              accept={REFERENCE_UPLOAD_ACCEPT}
              disabled={uploading}
              onChange={(e) => void handleUpload(e)}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {notice && (
        <div
          className={`mx-5 mt-4 text-sm px-3 py-2 rounded-lg border ${
            notice.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : "bg-red-950/40 border-red-500/30 text-red-300"
          }`}
        >
          {notice.message}
        </div>
      )}

      {reindexStatus && (
        <p className="text-xs text-indigo-300/80 px-5 pt-3">{reindexStatus}</p>
      )}

      <div className="p-5 space-y-6">
        {loadingRef ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading reference data…
          </div>
        ) : reference ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Data files" value={reference.stats.fileCount} accent="indigo" />
              <StatCard label="Rows" value={reference.stats.recordCount} accent="indigo" />
              <StatCard label="Documents" value={reference.pdfs.length} accent="indigo" />
              <StatCard
                label="RAG chunks"
                value={knowledgeStats?.reference ?? 0}
                accent="indigo"
              />
            </div>

            <p className="text-xs text-slate-500">
              Supported: Excel (.xlsx, .xls), CSV, PDF, TXT, Markdown · Max 25MB per file ·
              Re-upload replaces same filename
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">
                  Structured data files
                </p>
                {reference.files.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center border border-dashed border-white/10 rounded-xl">
                    No data files yet — use Add files to import Excel or CSV
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {reference.files.map((f) => (
                      <li key={f.id} className={`${glassCard} rounded-xl p-3 border border-white/5`}>
                        <div className="flex items-start gap-3">
                          <FileSpreadsheet className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{f.fileName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {f.category.replace(/_/g, " ")} · {f.sheetCount} sheet
                              {f.sheetCount !== 1 ? "s" : ""} · {f.rowCount.toLocaleString()} rows
                            </p>
                            {f.description && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                {f.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => void openEditDataFile(f.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                              title="Edit metadata"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  kind: "data-file",
                                  id: f.id,
                                  fileName: f.fileName,
                                })
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30"
                              title="Remove file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">
                  Documents &amp; text
                </p>
                {reference.pdfs.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center border border-dashed border-white/10 rounded-xl">
                    No documents yet — upload PDF, TXT, or Markdown
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {reference.pdfs.map((p) => (
                      <li key={p.id} className={`${glassCard} rounded-xl p-3 border border-white/5`}>
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{p.fileName}</p>
                            {p.summary && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-3">{p.summary}</p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => void openEditDocument(p.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                              title="Edit content"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  kind: "document",
                                  id: p.id,
                                  fileName: p.fileName,
                                })
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30"
                              title="Remove document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {!loadingKnowledge && referencePreview.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">
                  Indexed chunks (preview)
                </p>
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {referencePreview.map((c) => (
                    <li key={c.id} className="rounded-xl p-3 bg-slate-950/40 border border-indigo-500/10">
                      <p className="text-xs text-indigo-300 font-medium">{c.sourceLabel}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {c.sourceKind} · {c.charCount} chars
                      </p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.preview}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-red-400">Failed to load reference data</p>
        )}
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h4 className="font-semibold">
                {editTarget.kind === "data-file" ? "Edit data file" : "Edit document"}
              </h4>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs text-slate-500 block mb-1">File name</label>
                <input
                  className={glassInput}
                  value={editTarget.fileName}
                  onChange={(e) =>
                    setEditTarget({ ...editTarget, fileName: e.target.value })
                  }
                />
              </div>
              {editTarget.kind === "data-file" ? (
                <>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Category</label>
                    <select
                      className={glassInput}
                      value={editTarget.category}
                      onChange={(e) =>
                        setEditTarget({
                          ...editTarget,
                          category: e.target.value as ReferenceFileCategory,
                        })
                      }
                    >
                      {REFERENCE_FILE_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Description</label>
                    <textarea
                      className={`${glassInput} min-h-[80px]`}
                      value={editTarget.description}
                      onChange={(e) =>
                        setEditTarget({ ...editTarget, description: e.target.value })
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Summary</label>
                    <textarea
                      className={`${glassInput} min-h-[60px]`}
                      value={editTarget.summary}
                      onChange={(e) =>
                        setEditTarget({ ...editTarget, summary: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Content (used by AI)</label>
                    <textarea
                      className={`${glassInput} min-h-[200px] font-mono text-xs`}
                      value={editTarget.content}
                      onChange={(e) =>
                        setEditTarget({ ...editTarget, content: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
            </div>
            <div className="px-5 py-4 border-t border-white/10 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={saving}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save & sync"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-red-900/40 rounded-2xl shadow-2xl p-5">
            <h4 className="font-semibold text-red-300">Remove reference file?</h4>
            <p className="text-sm text-slate-400 mt-2">
              <span className="text-white font-medium">{deleteTarget.fileName}</span> will be
              deleted and removed from the AI knowledge index. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 rounded-lg text-white disabled:opacity-50"
              >
                {deleting ? "Removing…" : "Remove & sync"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
