"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Sparkles, FileText, Loader2 } from "lucide-react";
import NeuralBackground from "@/components/ui/flow-field-background";
import { PLATFORM_NAME, DEFAULT_GAPS } from "@/lib/aura/config";
import { COMPANY_CATEGORIES } from "@/lib/aura/company-utils";
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal";
import CompanyDetailView from "@/components/admin/CompanyDetailView";
import AdminRbacPanel from "@/components/admin/AdminRbacPanel";

interface CompanyRow {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  industry: string | null;
  description: string | null;
  aiContext: string | null;
  interviewDurationMinutes: number;
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

type AdminView = "dashboard" | "onboard" | "company-detail" | "session-detail" | "admin-settings";

interface AdminMe {
  email: string | null;
  role: string;
  roleLabel: string;
  legacy: boolean;
  companyId: string | null;
  permissions: {
    manageCompanies: boolean;
    manageAdminUsers: boolean;
  };
}

interface SessionDetail {
  id: string;
  status: string;
  completionPct: number;
  language: string;
  startedAt: string;
  participant: SessionRow["participant"];
  company: { id: string; name: string; category: string | null };
  messages: { role: string; content: string; createdAt: string }[];
  report: {
    executiveSummary: string;
    requirements: string;
    painPointsSummary: string;
    recommendations: string;
    actionItems: string;
  } | null;
}

const ONBOARD_STEPS = ["Company Info", "Business Context", "Interview Link"] as const;

type Notice = { type: "success" | "error"; message: string };

type DeleteSummary = {
  companyName: string;
  sessions: number;
  referenceFiles: number;
  storageFiles: number;
};

const glassPanel = "bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20";
const glassCard = "bg-slate-900/50 backdrop-blur-md border border-white/10 hover:border-amber-500/30 transition-colors";
const glassInput =
  "bg-slate-950/60 backdrop-blur-sm border border-white/10 rounded-xl focus:outline-none focus:border-amber-500/60";

export default function AdminPage() {
  const [view, setView] = useState<AdminView>("dashboard");
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyDetail, setCompanyDetail] = useState<{ company: CompanyRow; sessions: SessionRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteSummary, setDeleteSummary] = useState<DeleteSummary | null>(null);
  const [loadingDeleteSummary, setLoadingDeleteSummary] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "Other",
    industry: "",
    location: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    description: "",
    aiContext: "",
    interviewDurationMinutes: 5,
  });

  const [onboardStep, setOnboardStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "Other",
    industry: "",
    location: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    description: "",
    aiContext: "",
    interviewDurationMinutes: 5,
  });

  const [knowledgeFiles, setKnowledgeFiles] = useState<File[]>([]);
  const [adminMe, setAdminMe] = useState<AdminMe | null>(null);

  function showNotice(message: string, type: Notice["type"] = "success") {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 5000);
  }

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/companies?admin=true", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load companies");
      }
      setCompanies(data.companies ?? []);
      setCategories(data.categories ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load companies";
      setLoadError(message);
      setCompanies([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
    fetch("/api/admin/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d: AdminMe) => {
        setAdminMe(d);
        if (d.role === "COMPANY_ADMIN" && d.companyId) {
          void loadCompanyDetail(d.companyId);
        }
      })
      .catch(() => setAdminMe(null));
  }, [loadCompanies]);

  async function loadCompanyDetail(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${id}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load company");
      }
      setCompanyDetail(data);
      setSelectedCompanyId(id);
      setView("company-detail");
    } catch (e) {
      showNotice(e instanceof Error ? e.message : "Failed to load company", "error");
    } finally {
      setLoading(false);
    }
  }

  async function createCompany() {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create company");

      if (knowledgeFiles.length > 0 && data.company?.slug) {
        const formData = new FormData();
        formData.set("companySlug", data.company.slug);
        for (const file of knowledgeFiles) {
          formData.append("files", file);
        }
        const importRes = await fetch("/api/import", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const importData = await importRes.json();
        if (!importRes.ok) {
          throw new Error(importData.details ?? importData.error ?? "Knowledge file upload failed");
        }
      }

      setCreatedLink(data.interviewLink);
      setKnowledgeFiles([]);
      setOnboardStep(2);
      await loadCompanies();
      showNotice("Interview link generated successfully");
    } catch (e) {
      showNotice(e instanceof Error ? e.message : "Failed to create company", "error");
    } finally {
      setCreating(false);
    }
  }

  async function uploadReferenceFiles(slug: string, files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("companySlug", slug);
      for (const file of Array.from(files)) {
        formData.append("files", file);
      }
      const res = await fetch("/api/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details ?? data.error ?? "Upload failed");
      showNotice(`Uploaded ${files.length} file(s) successfully`);
    } catch (e) {
      showNotice(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  async function loadSession(sessionId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/interview?sessionId=${sessionId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load interview");
      setSessionDetail(data.session);
      setView("session-detail");
    } catch (e) {
      showNotice(e instanceof Error ? e.message : "Failed to load interview", "error");
    } finally {
      setLoading(false);
    }
  }

  async function downloadSessionReportPdf() {
    if (!sessionDetail?.report) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch(
        `/api/companies/${sessionDetail.company.id}/sessions/${sessionDetail.id}/report`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "PDF download failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      const fileName = match?.[1] ?? "interview-report.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showNotice(e instanceof Error ? e.message : "PDF download failed", "error");
    } finally {
      setDownloadingPdf(false);
    }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link);
    setCopied(true);
    showNotice("Interview link copied to clipboard");
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function openDeleteModal(company: { id: string; name: string }) {
    setDeleteTarget(company);
    setDeleteSummary(null);
    setLoadingDeleteSummary(true);
    try {
      const res = await fetch(`/api/companies/${company.id}?deletePreview=true`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load delete preview");
      setDeleteSummary(data.summary);
    } catch (e) {
      showNotice(e instanceof Error ? e.message : "Failed to load delete preview", "error");
      setDeleteTarget(null);
    } finally {
      setLoadingDeleteSummary(false);
    }
  }

  function closeDeleteModal(force = false) {
    if (deleting && !force) return;
    setDeleteTarget(null);
    setDeleteSummary(null);
  }

  async function confirmDeleteCompany() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/companies/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirmName: deleteTarget.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete company");

      closeDeleteModal(true);
      setCompanyDetail(null);
      setSelectedCompanyId(null);
      setView("dashboard");
      await loadCompanies();
      showNotice(data.message ?? "Company deleted successfully");
    } catch (e) {
      showNotice(e instanceof Error ? e.message : "Failed to delete company", "error");
    } finally {
      setDeleting(false);
    }
  }

  function startEditingCompany() {
    if (!companyDetail) return;
    const c = companyDetail.company;
    setEditForm({
      name: c.name,
      category: c.category ?? "Other",
      industry: c.industry ?? "",
      location: c.location ?? "",
      contactName: c.contactName ?? "",
      contactEmail: c.contactEmail ?? "",
      contactPhone: c.contactPhone ?? "",
      description: c.description ?? "",
      aiContext: c.aiContext ?? "",
      interviewDurationMinutes: c.interviewDurationMinutes ?? 5,
    });
    setEditing(true);
  }

  async function saveCompanyEdits() {
    if (!companyDetail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/companies/${companyDetail.company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save changes");
      await loadCompanyDetail(companyDetail.company.id);
      await loadCompanies();
      setEditing(false);
      showNotice("Company updated successfully");
    } catch (e) {
      showNotice(e instanceof Error ? e.message : "Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  }

  async function regenerateInterviewLink() {
    if (!companyDetail) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/companies/${companyDetail.company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ regenerateInviteToken: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to regenerate link");
      await loadCompanyDetail(companyDetail.company.id);
      await loadCompanies();
      setShowRegenerateConfirm(false);
      showNotice("New interview link generated. Old links no longer work.");
    } catch (e) {
      showNotice(e instanceof Error ? e.message : "Failed to regenerate link", "error");
    } finally {
      setRegenerating(false);
    }
  }

  function resetOnboard() {
    setForm({
      name: "",
      category: "Other",
      industry: "",
      location: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      description: "",
      aiContext: "",
      interviewDurationMinutes: 5,
    });
    setKnowledgeFiles([]);
    setOnboardStep(0);
    setCreatedLink(null);
    setView("dashboard");
  }

  const filtered =
    filterCategory === "all"
      ? companies
      : companies.filter((c) => c.category === filterCategory);

  const searched = searchQuery.trim()
    ? filtered.filter((c) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          (c.industry?.toLowerCase().includes(q) ?? false) ||
          (c.location?.toLowerCase().includes(q) ?? false)
        );
      })
    : filtered;

  const totalInterviews = companies.reduce((sum, c) => sum + c.sessionCount, 0);
  const totalCompleted = companies.reduce((sum, c) => sum + c.completedCount, 0);

  const grouped = searched.reduce<Record<string, CompanyRow[]>>((acc, c) => {
    const cat = c.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  return (
    <div className="relative min-h-screen text-slate-100 overflow-x-hidden">
      <div className="fixed inset-0 z-0">
        <NeuralBackground color="#818cf8" trailOpacity={0.1} speed={0.8} particleCount={500} />
      </div>

      <div className="relative z-10 min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl px-6 py-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-white text-sm transition-colors">← {PLATFORM_NAME}</Link>
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              METNMAT Admin
            </p>
            <h1 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Company & Interview Management
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {adminMe && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] uppercase text-slate-500">{adminMe.roleLabel}</p>
              <p className="text-xs text-slate-400">{adminMe.email ?? (adminMe.legacy ? "Legacy session" : "Admin")}</p>
            </div>
          )}
          {adminMe?.permissions.manageAdminUsers && (
            <button
              type="button"
              onClick={() => setView("admin-settings")}
              className="text-sm text-slate-400 hover:text-white border border-white/10 bg-slate-900/40 backdrop-blur-sm px-3 py-2 rounded-lg transition-colors"
            >
              Admin & audit
            </button>
          )}
          <button
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
              window.location.href = "/admin/login";
            }}
            className="text-sm text-slate-400 hover:text-white border border-white/10 bg-slate-900/40 backdrop-blur-sm px-3 py-2 rounded-lg transition-colors"
          >
            Sign out
          </button>
          <button
            onClick={() => { setView("onboard"); setOnboardStep(0); setCreatedLink(null); }}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm shadow-lg shadow-amber-500/20 transition-colors disabled:opacity-40"
            disabled={adminMe != null && !adminMe.permissions.manageCompanies}
          >
            + Onboard New Company
          </button>
        </div>
      </header>

      {notice && (
        <div
          className={`mx-6 mt-4 rounded-xl border px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border-green-800 bg-green-950/50 text-green-300"
              : "border-red-800 bg-red-950/50 text-red-300"
          }`}
        >
          {notice.message}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          company={deleteTarget}
          summary={deleteSummary}
          loadingSummary={loadingDeleteSummary}
          deleting={deleting}
          onConfirm={confirmDeleteCompany}
          onClose={closeDeleteModal}
        />
      )}

      {view === "onboard" && (
        <main className="max-w-2xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 mb-8">
            {ONBOARD_STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= onboardStep ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-500"}`}>
                  {i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${i === onboardStep ? "text-amber-400" : "text-slate-500"}`}>{label}</span>
                {i < ONBOARD_STEPS.length - 1 && <div className="flex-1 h-px bg-slate-800" />}
              </div>
            ))}
          </div>

          {onboardStep === 0 && (
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-4">
              <h2 className="text-lg font-semibold">Step 1 — Company Information</h2>
              <p className="text-sm text-slate-400">Enter client company details. METNMAT admin uses this to configure the interview.</p>
              <input placeholder="Company name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm">
                  {COMPANY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <input placeholder="Location / Plant" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
              <input placeholder="Contact person name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Contact email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
                <input placeholder="Contact phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={resetOnboard} className="flex-1 border border-slate-700 rounded-xl py-3 text-sm">Cancel</button>
                <button onClick={() => form.name.trim() && setOnboardStep(1)} disabled={!form.name.trim()} className="flex-[2] bg-amber-500 disabled:opacity-50 text-slate-950 font-semibold rounded-xl py-3 text-sm">Next →</button>
              </div>
            </div>
          )}

          {onboardStep === 1 && (
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-4">
              <h2 className="text-lg font-semibold">Step 2 — Business Context for AI</h2>
              <p className="text-sm text-slate-400">Help AURA understand this company&apos;s operations. This improves interview quality.</p>
              <textarea placeholder="Company description — what they do, key operations..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm h-28" />
              <textarea placeholder="AI context — processes, systems, known data, industry specifics (optional but recommended)..." value={form.aiContext} onChange={(e) => setForm({ ...form, aiContext: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm h-36" />

              <div className="space-y-2">
                <label className="text-sm text-slate-300">Company knowledge files (PDF / TXT)</label>
                <p className="text-xs text-slate-500">Upload brochures, process docs, or org charts — AURA uses these with description &amp; AI context to ask better questions.</p>
                <input
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  multiple
                  onChange={(e) => setKnowledgeFiles(e.target.files ? Array.from(e.target.files) : [])}
                  className="w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-500/20 file:text-amber-300"
                />
                {knowledgeFiles.length > 0 && (
                  <p className="text-xs text-emerald-400">{knowledgeFiles.length} file(s) ready to upload</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300">Interview session duration (minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={form.interviewDurationMinutes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      interviewDurationMinutes: Math.min(60, Math.max(5, Number(e.target.value) || 5)),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm"
                />
                <p className="text-xs text-slate-500">Employees see a timer during the chat. You can edit this later in company settings.</p>
              </div>

              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                <p className="text-xs text-slate-500 mb-2">Common gaps AURA will explore:</p>
                <ul className="text-xs text-slate-400 space-y-1">
                  {DEFAULT_GAPS.slice(0, 4).map((g) => <li key={g}>→ {g}</li>)}
                </ul>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setOnboardStep(0)} className="flex-1 border border-slate-700 rounded-xl py-3 text-sm">← Back</button>
                <button onClick={createCompany} disabled={creating} className="flex-[2] bg-amber-500 disabled:opacity-50 text-slate-950 font-semibold rounded-xl py-3 text-sm">
                  {creating ? "Creating..." : "Generate Interview Link →"}
                </button>
              </div>
            </div>
          )}

          {onboardStep === 2 && createdLink && (
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-amber-500/30 space-y-6 text-center">
              <div className="text-4xl">✓</div>
              <h2 className="text-xl font-semibold text-amber-400">{form.name} is ready!</h2>
              <p className="text-sm text-slate-400">Share this link with {form.name} employees. They will enter their details and complete the AI interview.</p>
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input readOnly value={createdLink} className="flex-1 bg-transparent text-sm text-amber-400 truncate outline-none" />
                <div className="flex gap-2 shrink-0">
                  <a
                    href={createdLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-slate-600 text-slate-200 font-semibold px-4 py-2 rounded-lg text-sm text-center"
                  >
                    Open Link
                  </a>
                  <button onClick={() => copyLink(createdLink)} className="bg-amber-500 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm">
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">Category: {form.category} · All interview data will appear in Admin under this company.</p>
              <div className="flex gap-3">
                <button onClick={resetOnboard} className="flex-1 border border-slate-700 rounded-xl py-3 text-sm">Go to Dashboard</button>
                <button onClick={() => { setOnboardStep(0); setCreatedLink(null); setForm({ ...form, name: "" }); }} className="flex-1 bg-slate-800 rounded-xl py-3 text-sm">Onboard Another</button>
              </div>
            </div>
          )}
        </main>
      )}

      {view === "dashboard" && (
        <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Companies", value: companies.length },
              { label: "Interviews", value: totalInterviews },
              { label: "Completed", value: totalCompleted },
              { label: "Categories", value: categories.length },
            ].map((stat) => (
              <div key={stat.label} className={`${glassPanel} rounded-xl p-4`}>
                <p className="text-2xl font-bold text-amber-400">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className={`flex items-center gap-4 flex-wrap ${glassPanel} rounded-xl p-4`}>
            <input
              type="search"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`flex-1 min-w-[200px] ${glassInput} px-4 py-2 text-sm`}
            />
            <label className="text-sm text-slate-400">Filter by category:</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={`${glassInput} px-3 py-2 text-sm`}
            >
              <option value="all">All Categories ({companies.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c} ({companies.filter((x) => x.category === c).length})</option>
              ))}
            </select>
          </div>

          {loadError ? (
            <div className="text-center py-16 text-red-300 bg-red-950/30 border border-red-900 rounded-xl">
              <p>{loadError}</p>
              <button onClick={() => loadCompanies()} className="mt-4 text-amber-400 underline text-sm">Retry</button>
            </div>
          ) : loading ? (
            <p className="text-slate-400">Loading...</p>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p>{searchQuery.trim() ? "No companies match your search." : "No companies yet."}</p>
              {!searchQuery.trim() && (
                <button onClick={() => setView("onboard")} className="mt-4 text-amber-400 underline text-sm">Onboard your first company</button>
              )}
            </div>
          ) : (
            Object.entries(grouped).map(([category, list]) => (
              <section key={category}>
                <h2 className="text-sm uppercase tracking-widest text-amber-400/80 mb-3">{category}</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {list.map((c) => (
                    <div key={c.id} className={`${glassCard} rounded-xl p-5`}>
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h3 className="font-semibold text-lg">{c.name}</h3>
                          {c.industry && <p className="text-xs text-slate-500 mt-0.5">{c.industry}</p>}
                          {c.location && <p className="text-xs text-slate-500">{c.location}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-2xl font-bold text-amber-400">{c.sessionCount}</p>
                          <p className="text-xs text-slate-500">interviews</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={() => copyLink(c.interviewLink)} className="text-xs bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors">Copy Link</button>
                        <a
                          href={c.interviewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs border border-slate-700 hover:bg-slate-800 px-3 py-1.5 rounded-lg"
                        >
                          Open
                        </a>
                        <button onClick={() => loadCompanyDetail(c.id)} className="text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg">View Details</button>
                        <button
                          onClick={() => openDeleteModal({ id: c.id, name: c.name })}
                          className="text-xs text-red-400 border border-red-900/50 hover:bg-red-950/40 px-3 py-1.5 rounded-lg ml-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </main>
      )}

      {view === "company-detail" && companyDetail && (
        editing ? (
          <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
            <button onClick={() => { setView("dashboard"); setCompanyDetail(null); setEditing(false); }} className="text-sm text-slate-400 hover:text-white">← Back to dashboard</button>
            <div className={`${glassPanel} rounded-2xl p-6 border-amber-500/30 space-y-4`}>
              <h2 className="text-lg font-semibold">Edit Company</h2>
              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Company name" className={`w-full ${glassInput} px-4 py-2.5 text-sm`} />
              <div className="grid grid-cols-2 gap-3">
                <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className={`${glassInput} px-4 py-2.5 text-sm`}>
                  {COMPANY_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <input value={editForm.industry} onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })} placeholder="Industry" className={`${glassInput} px-4 py-2.5 text-sm`} />
              </div>
              <input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="Location" className={`w-full ${glassInput} px-4 py-2.5 text-sm`} />
              <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" className={`w-full ${glassInput} px-4 py-2.5 text-sm h-24`} />
              <textarea value={editForm.aiContext} onChange={(e) => setEditForm({ ...editForm, aiContext: e.target.value })} placeholder="AI context" className={`w-full ${glassInput} px-4 py-2.5 text-sm h-28`} />
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Interview session duration (minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={editForm.interviewDurationMinutes}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      interviewDurationMinutes: Math.min(60, Math.max(5, Number(e.target.value) || 5)),
                    })
                  }
                  className={`w-full ${glassInput} px-4 py-2.5 text-sm`}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditing(false)} className="flex-1 border border-white/10 rounded-xl py-3 text-sm hover:bg-slate-800/60">Cancel</button>
                <button onClick={saveCompanyEdits} disabled={saving || !editForm.name.trim()} className="flex-[2] bg-amber-500 disabled:opacity-50 text-slate-950 font-semibold rounded-xl py-3 text-sm">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </main>
        ) : (
          <CompanyDetailView
            company={companyDetail.company}
            sessions={companyDetail.sessions}
            glassPanel={glassPanel}
            glassCard={glassCard}
            copied={copied}
            uploading={uploading}
            showRegenerateConfirm={showRegenerateConfirm}
            regenerating={regenerating}
            onBack={() => { setView("dashboard"); setCompanyDetail(null); setEditing(false); }}
            onEdit={startEditingCompany}
            onDelete={() => openDeleteModal({ id: companyDetail.company.id, name: companyDetail.company.name })}
            onCopyLink={copyLink}
            onRegenerateConfirm={() => setShowRegenerateConfirm(true)}
            onRegenerateCancel={() => setShowRegenerateConfirm(false)}
            onRegenerate={regenerateInterviewLink}
            onUploadReference={uploadReferenceFiles}
            onOpenSession={loadSession}
            onRefresh={() => companyDetail && loadCompanyDetail(companyDetail.company.id)}
          />
        )
      )}

      {view === "session-detail" && sessionDetail && (
        <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          <button
            onClick={() => { setView("company-detail"); setSessionDetail(null); }}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to company
          </button>

          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{sessionDetail.participant?.fullName ?? "Employee interview"}</h2>
              <p className="text-sm text-slate-400 mt-1">
                {sessionDetail.company.name} · {sessionDetail.status} · {sessionDetail.completionPct}%
              </p>
            </div>
            {sessionDetail.report && (
              <button
                type="button"
                onClick={() => void downloadSessionReportPdf()}
                disabled={downloadingPdf}
                className="flex items-center gap-2 text-sm bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 px-3 py-2 rounded-lg disabled:opacity-50"
              >
                {downloadingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Download PDF
              </button>
            )}
          </div>

          {sessionDetail.report ? (
            <div className="space-y-4">
              {(
                [
                  ["Executive Summary", sessionDetail.report.executiveSummary],
                  ["Requirements", sessionDetail.report.requirements],
                  ["Pain Points", sessionDetail.report.painPointsSummary],
                  ["Recommendations", sessionDetail.report.recommendations],
                  ["Action Items", sessionDetail.report.actionItems],
                ] as const
              ).map(([title, content]) => (
                <section key={title} className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                  <h3 className="text-sm uppercase tracking-widest text-amber-400 mb-3">{title}</h3>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{content}</p>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Interview in progress — report will appear when completed.</p>
          )}

          <section>
            <h3 className="text-lg font-semibold mb-3">Conversation</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sessionDetail.messages.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-3 text-sm ${m.role === "assistant" ? "bg-slate-900 border border-slate-800" : "bg-amber-500/10 border border-amber-500/20"}`}
                >
                  <p className="text-xs text-slate-500 mb-1 capitalize">{m.role}</p>
                  <p className="text-slate-300 whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {view === "admin-settings" && adminMe?.permissions.manageAdminUsers && (
        <main className="max-w-5xl mx-auto px-6 py-8">
          <button
            onClick={() => setView("dashboard")}
            className="text-sm text-slate-400 hover:text-white mb-6"
          >
            ← Back to dashboard
          </button>
          <AdminRbacPanel />
        </main>
      )}
      </div>
    </div>
  );
}
