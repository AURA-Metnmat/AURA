"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LANGUAGES, UI, SECTION_NAMES, type Language } from "@/lib/aura/i18n";

interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

interface ParticipantForm {
  fullName: string;
  designation: string;
  department: string;
  mobile: string;
  email: string;
}

interface InterviewFlowProps {
  companyId: string;
  companyName: string;
  showCompanyBadge?: boolean;
}

export default function InterviewFlow({
  companyId,
  companyName,
  showCompanyBadge = true,
}: InterviewFlowProps) {
  const [step, setStep] = useState<"language" | "details" | "chat">("language");
  const [language, setLanguage] = useState<Language>("en");
  const [form, setForm] = useState<ParticipantForm>({
    fullName: "",
    designation: "",
    department: "",
    mobile: "",
    email: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ParticipantForm, string>>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentSection, setCurrentSection] = useState("B");
  const [completionPct, setCompletionPct] = useState(0);
  const [report, setReport] = useState<Record<string, string> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = UI[language];
  const sections = SECTION_NAMES[language];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingFiles]);

  function validateForm(): boolean {
    const errors: Partial<Record<keyof ParticipantForm, string>> = {};
    if (!form.fullName.trim()) errors.fullName = t.nameRequired;
    if (!form.designation.trim()) errors.designation = t.designationRequired;
    if (!form.department.trim()) errors.department = t.departmentRequired;
    if (!form.mobile.trim()) errors.mobile = t.mobileRequired;
    else if (!/^\d{10}$/.test(form.mobile.replace(/\D/g, "").slice(-10))) {
      errors.mobile = t.invalidMobile;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function startInterview() {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          companyId,
          language,
          participant: {
            fullName: form.fullName.trim(),
            designation: form.designation.trim(),
            department: form.department.trim(),
            mobile: form.mobile.replace(/\D/g, "").slice(-10),
            email: form.email.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessionId(data.sessionId);
      setMessages([{ role: "assistant", content: data.message }]);
      setCurrentSection(data.currentSection);
      setCompletionPct(data.completionPct);
      setStep("chat");
    } catch {
      alert("Failed to start interview. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length || !sessionId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("sessionId", sessionId);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok && data.attachment) {
          setPendingFiles((prev) => [...prev, data.attachment]);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && pendingFiles.length === 0) || loading || !sessionId) return;
    const userMsg = input.trim() || `📎 ${pendingFiles.map((f) => f.fileName).join(", ")}`;
    const msgAttachments = [...pendingFiles];
    setInput("");
    setPendingFiles([]);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg, attachments: msgAttachments.length ? msgAttachments : undefined },
    ]);
    setLoading(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: userMsg,
          attachmentIds: msgAttachments.map((a) => a.id),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      setCurrentSection(data.currentSection);
      setCompletionPct(data.completionPct);
      if (data.shouldComplete) await completeInterview();
    } finally {
      setLoading(false);
    }
  }

  async function completeInterview() {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: "confirmed", action: "complete" }),
      });
      const data = await res.json();
      if (data.report) setReport(data.report);
    } finally {
      setLoading(false);
    }
  }

  function renderAttachment(att: Attachment) {
    const isImage = att.fileType.startsWith("image/");
    return (
      <a
        key={att.id}
        href={att.filePath}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-2 rounded-lg overflow-hidden border border-white/20 max-w-xs"
      >
        {isImage ? (
          <Image src={att.filePath} alt={att.fileName} width={240} height={160} className="object-cover w-full max-h-40" unoptimized />
        ) : (
          <div className="px-3 py-2 text-xs bg-black/20 flex items-center gap-2">
            <span>📄</span>
            <span className="truncate">{att.fileName}</span>
          </div>
        )}
      </a>
    );
  }

  if (report) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 px-6 py-4">
          <p className="text-xs uppercase tracking-widest text-amber-400">AURA-METNMAT</p>
          <h1 className="text-xl font-semibold">{t.reportComplete}</h1>
          <p className="text-sm text-slate-500 mt-1">{companyName}</p>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
          {Object.entries(report).map(([key, value]) => (
            <section key={key} className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-lg font-semibold text-amber-400 capitalize mb-4">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </h2>
              <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">{value}</div>
            </section>
          ))}
          <p className="text-center text-sm text-slate-500">
            Thank you. Your responses have been saved for {companyName}.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-400">AURA-METNMAT Interview</p>
          <h1 className="text-lg font-semibold">{showCompanyBadge ? companyName : form.fullName || "Interview"}</h1>
        </div>
        <div className="flex items-center gap-3">
          {step !== "language" && (
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              disabled={step === "chat"}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>{l.native}</option>
              ))}
            </select>
          )}
          {step === "chat" && (
            <>
              <span className="text-xs bg-slate-800 px-3 py-1 rounded-full hidden sm:inline">
                {t.section} {currentSection}: {sections[currentSection]}
              </span>
              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${completionPct}%` }} />
              </div>
              <span className="text-xs text-slate-400">{completionPct}%</span>
            </>
          )}
        </div>
      </header>

      {step === "language" && (
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-lg w-full text-center space-y-8">
            <div>
              <p className="text-amber-400/80 text-sm mb-2">{companyName}</p>
              <h2 className="text-3xl font-bold mb-3">{t.welcome}</h2>
              <p className="text-slate-400 leading-relaxed">{t.welcomeDesc}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-4">{t.selectLanguage}</p>
              <div className="grid grid-cols-3 gap-3">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { setLanguage(l.id); setStep("details"); }}
                    className="p-4 rounded-xl border border-slate-700 hover:border-amber-500 hover:bg-slate-900 transition-all"
                  >
                    <p className="font-semibold text-lg">{l.native}</p>
                    <p className="text-xs text-slate-400 mt-1">{l.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {step === "details" && (
        <main className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center">
              <p className="text-amber-400/80 text-sm">{companyName}</p>
              <h2 className="text-2xl font-bold mt-2 mb-2">{t.yourDetails}</h2>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); startInterview(); }} className="space-y-4 bg-slate-900 rounded-2xl p-6 border border-slate-800">
              {(
                [
                  { key: "fullName" as const, label: t.fullName, required: true, type: "text" },
                  { key: "designation" as const, label: t.designation, required: true, type: "text" },
                  { key: "department" as const, label: t.department, required: true, type: "text" },
                  { key: "mobile" as const, label: t.mobile, required: true, type: "tel" },
                  { key: "email" as const, label: t.emailOptional, required: false, type: "email" },
                ]
              ).map((field) => (
                <div key={field.key}>
                  <label className="block text-sm text-slate-400 mb-1">
                    {field.label}{field.required && <span className="text-amber-500 ml-1">*</span>}
                  </label>
                  <input
                    type={field.type}
                    value={form[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                  />
                  {formErrors[field.key] && <p className="text-xs text-red-400 mt-1">{formErrors[field.key]}</p>}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep("language")} className="flex-1 border border-slate-700 rounded-xl py-3 text-sm hover:bg-slate-800">←</button>
                <button type="submit" disabled={loading} className="flex-[3] bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold rounded-xl py-3 text-sm">
                  {loading ? "..." : t.startInterview}
                </button>
              </div>
            </form>
          </div>
        </main>
      )}

      {step === "chat" && (
        <>
          <main className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl mx-auto w-full">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-100 border border-slate-700"}`}>
                    {msg.role === "assistant" && <p className="text-xs text-amber-400 mb-1 font-medium">AURA</p>}
                    {msg.content}
                    {msg.attachments?.map(renderAttachment)}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-400 border border-slate-700">{t.thinking}</div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </main>
          <footer className="border-t border-slate-800 px-6 py-4 shrink-0">
            {pendingFiles.length > 0 && (
              <div className="max-w-3xl mx-auto mb-3 flex flex-wrap gap-2">
                {pendingFiles.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 text-xs">
                    <span className="truncate max-w-[120px]">{f.fileName}</span>
                    <button type="button" onClick={() => setPendingFiles((p) => p.filter((x) => x.id !== f.id))} className="text-red-400">×</button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex gap-2">
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,.xlsx,.xls,.doc,.docx,.txt,.csv" multiple className="hidden" onChange={handleFileSelect} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading || uploading || !sessionId} className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl border border-slate-700 hover:border-amber-500 disabled:opacity-50 text-lg">{uploading ? "…" : "📎"}</button>
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.typeResponse} disabled={loading} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50" />
              <button type="submit" disabled={loading || (!input.trim() && pendingFiles.length === 0)} className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold px-6 py-3 rounded-xl text-sm">{t.send}</button>
            </form>
            {completionPct >= 85 && (
              <div className="max-w-3xl mx-auto mt-3 text-center">
                <button onClick={completeInterview} disabled={loading} className="text-xs text-amber-400 hover:text-amber-300 underline">{t.finishReport}</button>
              </div>
            )}
          </footer>
        </>
      )}
    </div>
  );
}
