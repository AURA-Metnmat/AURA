"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PLATFORM_NAME, DEFAULT_GAPS } from "@/lib/aura/config";
import { COMPANY_CATEGORIES } from "@/lib/aura/company-utils";

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

type AdminView = "dashboard" | "onboard" | "company-detail" | "session-detail";

interface SessionDetail {
  id: string;
  status: string;
  completionPct: number;
  language: string;
  startedAt: string;
  participant: SessionRow["participant"];
  company: { name: string; category: string | null };
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

export default function AdminPage() {
  const [view, setView] = useState<AdminView>("dashboard");
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyDetail, setCompanyDetail] = useState<{ company: CompanyRow; sessions: SessionRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);

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
  });

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/companies?admin=true", { credentials: "include" });
      const data = await res.json();
      setCompanies(data.companies ?? []);
      setCategories(data.categories ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  async function loadCompanyDetail(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${id}`, { credentials: "include" });
      const data = await res.json();
      setCompanyDetail(data);
      setSelectedCompanyId(id);
      setView("company-detail");
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
      if (!res.ok) throw new Error(data.error);
      setCreatedLink(data.interviewLink);
      setOnboardStep(2);
      await loadCompanies();
    } catch {
      alert("Failed to create company");
    } finally {
      setCreating(false);
    }
  }

  async function importReference(slug: string) {
    setImporting(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ companySlug: slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details ?? data.error);
      alert(`Import complete: ${JSON.stringify(data.stats)}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
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
      if (!res.ok) throw new Error(data.details ?? data.error);
      alert(`Uploaded ${files.length} file(s). Stats: ${JSON.stringify(data.stats)}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function loadSession(sessionId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/interview?sessionId=${sessionId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessionDetail(data.session);
      setView("session-detail");
    } finally {
      setLoading(false);
    }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    });
    setOnboardStep(0);
    setCreatedLink(null);
    setView("dashboard");
  }

  const filtered =
    filterCategory === "all"
      ? companies
      : companies.filter((c) => c.category === filterCategory);

  const grouped = filtered.reduce<Record<string, CompanyRow[]>>((acc, c) => {
    const cat = c.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-white text-sm">← {PLATFORM_NAME}</Link>
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-400">METNMAT Admin</p>
            <h1 className="text-xl font-semibold">Company & Interview Management</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
              window.location.href = "/admin/login";
            }}
            className="text-sm text-slate-400 hover:text-white border border-slate-700 px-3 py-2 rounded-lg"
          >
            Sign out
          </button>
          <button
            onClick={() => { setView("onboard"); setOnboardStep(0); setCreatedLink(null); }}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm"
          >
            + Onboard New Company
          </button>
        </div>
      </header>

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
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
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
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
              <h2 className="text-lg font-semibold">Step 2 — Business Context for AI</h2>
              <p className="text-sm text-slate-400">Help AURA understand this company&apos;s operations. This improves interview quality.</p>
              <textarea placeholder="Company description — what they do, key operations..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm h-28" />
              <textarea placeholder="AI context — processes, systems, known data, industry specifics (optional but recommended)..." value={form.aiContext} onChange={(e) => setForm({ ...form, aiContext: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm h-36" />
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
            <div className="bg-slate-900 rounded-2xl p-6 border border-amber-500/30 space-y-6 text-center">
              <div className="text-4xl">✓</div>
              <h2 className="text-xl font-semibold text-amber-400">{form.name} is ready!</h2>
              <p className="text-sm text-slate-400">Share this link with {form.name} employees. They will enter their details and complete the AI interview.</p>
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-700 flex items-center gap-3">
                <input readOnly value={createdLink} className="flex-1 bg-transparent text-sm text-amber-400 truncate outline-none" />
                <button onClick={() => copyLink(createdLink)} className="shrink-0 bg-amber-500 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm">
                  {copied ? "Copied!" : "Copy Link"}
                </button>
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
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm text-slate-400">Filter by category:</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
              <option value="all">All Categories ({companies.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c} ({companies.filter((x) => x.category === c).length})</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-slate-400">Loading...</p>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p>No companies yet.</p>
              <button onClick={() => setView("onboard")} className="mt-4 text-amber-400 underline text-sm">Onboard your first company</button>
            </div>
          ) : (
            Object.entries(grouped).map(([category, list]) => (
              <section key={category}>
                <h2 className="text-sm uppercase tracking-widest text-amber-400/80 mb-3">{category}</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {list.map((c) => (
                    <div key={c.id} className="bg-slate-900 rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-colors">
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
                        <button onClick={() => copyLink(c.interviewLink)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg">Copy Link</button>
                        <button onClick={() => loadCompanyDetail(c.id)} className="text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg">View Details</button>
                        <button onClick={() => importReference(c.slug)} disabled={importing} className="text-xs border border-slate-700 px-3 py-1.5 rounded-lg disabled:opacity-50">Import Data</button>
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
        <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          <button onClick={() => { setView("dashboard"); setCompanyDetail(null); }} className="text-sm text-slate-400 hover:text-white">← Back to dashboard</button>

          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">{companyDetail.company.category}</span>
                <h2 className="text-2xl font-bold mt-2">{companyDetail.company.name}</h2>
                <p className="text-sm text-slate-400 mt-1">{companyDetail.company.industry} · {companyDetail.company.location}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-amber-400">{companyDetail.sessions.length}</p>
                <p className="text-xs text-slate-500">total interviews</p>
              </div>
            </div>

            <div className="mt-6 bg-slate-950 rounded-xl p-4 border border-slate-700">
              <p className="text-xs text-slate-500 mb-2">Employee Interview Link</p>
              <div className="flex gap-2">
                <input readOnly value={companyDetail.company.interviewLink} className="flex-1 bg-transparent text-sm text-amber-400 truncate" />
                <button onClick={() => copyLink(companyDetail.company.interviewLink)} className="bg-amber-500 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm">{copied ? "Copied!" : "Copy"}</button>
              </div>
            </div>

            {companyDetail.company.description && (
              <p className="text-sm text-slate-400 mt-4">{companyDetail.company.description}</p>
            )}

            <div className="mt-6 border border-slate-800 rounded-xl p-4">
              <p className="text-sm font-medium mb-2">Import reference data (Excel / PDF)</p>
              <p className="text-xs text-slate-500 mb-3">Upload client files — works on Vercel production.</p>
              <input
                type="file"
                multiple
                accept=".xlsx,.xls,.pdf"
                disabled={uploading}
                onChange={(e) => uploadReferenceFiles(companyDetail.company.slug, e.target.files)}
                className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-amber-500 file:text-slate-950 file:font-semibold"
              />
            </div>
          </div>

          <section>
            <h3 className="text-lg font-semibold mb-4">Employee Interviews</h3>
            {companyDetail.sessions.length === 0 ? (
              <p className="text-slate-500 text-sm">No interviews yet. Share the link above with employees.</p>
            ) : (
              <div className="space-y-3">
                {companyDetail.sessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => loadSession(s.id)}
                    className="w-full text-left bg-slate-900 rounded-xl p-4 border border-slate-800 hover:border-amber-500/40 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{s.participant?.fullName ?? "Anonymous"}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {s.participant?.designation && `${s.participant.designation} · `}
                          {s.participant?.department && `${s.participant.department} · `}
                          {s.participant?.mobile && `📱 ${s.participant.mobile}`}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">{new Date(s.startedAt).toLocaleString()} · {s.language.toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full ${s.status === "completed" ? "bg-green-950 text-green-400" : "bg-slate-800 text-slate-400"}`}>{s.status}</span>
                        <p className="text-sm text-amber-400 mt-1">{s.completionPct}%</p>
                        {s.hasReport && <p className="text-xs text-green-500 mt-1">Report ✓ — click to view</p>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {view === "session-detail" && sessionDetail && (
        <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          <button
            onClick={() => { setView("company-detail"); setSessionDetail(null); }}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to company
          </button>

          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <h2 className="text-xl font-bold">{sessionDetail.participant?.fullName ?? "Employee interview"}</h2>
            <p className="text-sm text-slate-400 mt-1">
              {sessionDetail.company.name} · {sessionDetail.status} · {sessionDetail.completionPct}%
            </p>
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
    </div>
  );
}
