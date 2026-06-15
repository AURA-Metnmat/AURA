"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { PREFERRED_LANGUAGES, UI, SECTION_NAMES, type Language } from "@/lib/aura/i18n";
import { getEngagement } from "@/lib/aura/engagement";
import { resolveMessageLocale } from "@/lib/aura/message-locale";
import { InterviewWelcome } from "@/components/interview/InterviewWelcome";
import { InterviewDetailsForm } from "@/components/interview/InterviewDetailsForm";
import { InterviewShell } from "@/components/interview/InterviewShell";
import { LanguageBar } from "@/components/interview/LanguageBar";
import { BilingualChat, type BilingualMessage } from "@/components/interview/BilingualChat";
import { InterviewChatComposer } from "@/components/interview/InterviewChatComposer";

interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
}

interface Message {
  role: "user" | "assistant";
  contentEn: string;
  contentLocale: string;
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
  interviewDurationMinutes?: number;
  showCompanyBadge?: boolean;
}

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function InterviewFlow({
  companyId,
  companyName,
  interviewDurationMinutes: initialDurationMinutes = 5,
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
  const [chatError, setChatError] = useState<string | null>(null);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(initialDurationMinutes);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const t = UI[language];
  const tEn = UI.en;
  const engagement = getEngagement(language);
  const sections = SECTION_NAMES[language];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingFiles]);

  useEffect(() => {
    if (!sessionStartedAt || step !== "chat") return;
    const totalSeconds = sessionDurationMinutes * 60;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - sessionStartedAt) / 1000);
      setRemainingSeconds(Math.max(0, totalSeconds - elapsed));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [sessionStartedAt, sessionDurationMinutes, step]);

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

  async function changeLanguage(newLang: Language) {
    if (newLang === language) return;
    setLanguage(newLang);
    setChatError(null);
    setMessages((prev) =>
      prev.map((msg) =>
        msg.role === "assistant"
          ? {
              ...msg,
              contentLocale: resolveMessageLocale(
                msg.contentEn,
                msg.contentLocale,
                newLang,
                form.fullName
              ),
            }
          : msg
      )
    );
    if (!sessionId) return;
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateLanguage", sessionId, language: newLang }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to switch language");
      }
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Failed to switch language. Please try again.");
    }
  }

  async function startInterview() {
    if (!validateForm()) return;
    setLoading(true);
    setChatError(null);
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
      setMessages([
        {
          role: "assistant",
          contentEn: data.message,
          contentLocale: resolveMessageLocale(
            data.message,
            data.messageLocale ?? data.message,
            language,
            form.fullName.trim()
          ),
        },
      ]);
      setCurrentSection(data.currentSection);
      setCompletionPct(data.completionPct);
      if (typeof data.interviewDurationMinutes === "number") {
        setSessionDurationMinutes(data.interviewDurationMinutes);
      }
      setSessionStartedAt(Date.now());
      setStep("chat");
    } catch {
      setChatError("Failed to start interview. Please try again.");
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
        } else {
          setChatError(data.error ?? "Failed to upload file. Please try again.");
        }
      }
    } finally {
      setUploading(false);
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
      {
        role: "user",
        contentEn: userMsg,
        contentLocale: userMsg,
        attachments: msgAttachments.length ? msgAttachments : undefined,
      },
    ]);
    setLoading(true);
    setChatError(null);
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
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send message");
      }
      setMessages((prev) => {
        const updated = [...prev];
        const lastUserIdx = updated.length - 1;
        if (lastUserIdx >= 0 && updated[lastUserIdx].role === "user" && data.userMessageEn) {
          updated[lastUserIdx] = {
            ...updated[lastUserIdx],
            contentEn: data.userMessageEn,
            contentLocale: data.userMessageLocale ?? updated[lastUserIdx].contentLocale,
          };
        }
        return [
          ...updated,
          {
            role: "assistant",
            contentEn: data.message,
            contentLocale: data.messageLocale ?? data.message,
          },
        ];
      });
      setCurrentSection(data.currentSection);
      setCompletionPct(data.completionPct);
      if (data.shouldComplete) await completeInterview();
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function completeInterview() {
    if (!sessionId) return;
    setLoading(true);
    setChatError(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: "confirmed", action: "complete" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to complete interview");
      }
      if (data.report) setReport(data.report);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Failed to complete interview. Please try again.");
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
          <Image
            src={att.filePath}
            alt={att.fileName}
            width={240}
            height={160}
            className="object-cover w-full max-h-40"
            unoptimized
          />
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
      <InterviewShell>
        <header className="border-b border-white/10 px-6 py-4 backdrop-blur-sm bg-slate-950/50">
          <p className="text-xs uppercase tracking-widest text-amber-400">AURA-METNMAT</p>
          <h1 className="text-xl font-semibold">{t.reportComplete}</h1>
          <p className="text-sm text-slate-500 mt-1">{companyName}</p>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
          {Object.entries(report).map(([key, value]) => (
            <section key={key} className="bg-slate-900/70 rounded-xl p-6 border border-white/10 backdrop-blur-sm">
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
      </InterviewShell>
    );
  }

  return (
    <InterviewShell>
      <header className="border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between shrink-0 backdrop-blur-sm bg-slate-950/60">
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-400">AURA-METNMAT Interview</p>
          <h1 className="text-lg font-semibold">{showCompanyBadge ? companyName : form.fullName || "Interview"}</h1>
        </div>
        <div className="flex items-center gap-3">
          {step === "details" && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-500">
              <span className="text-emerald-400">● Lang</span>
              <span>—</span>
              <span className="text-amber-400">● Details</span>
              <span>—</span>
              <span>○ Chat</span>
            </div>
          )}
          {step === "chat" && (
            <>
              <span className="text-xs bg-slate-800/80 px-3 py-1 rounded-full hidden lg:inline border border-white/10">
                {t.section} {currentSection}: {sections[currentSection]}
              </span>
              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 tabular-nums">{completionPct}%</span>
              {remainingSeconds !== null && (
                <span
                  className={`text-xs tabular-nums px-2 py-1 rounded-lg border ${
                    remainingSeconds <= 300
                      ? "border-red-500/50 text-red-300 bg-red-950/30"
                      : "border-white/10 text-slate-400 bg-slate-800/80"
                  }`}
                >
                  {formatRemaining(remainingSeconds)} left
                </span>
              )}
            </>
          )}
        </div>
      </header>

      {step === "language" && (
        <InterviewWelcome
          companyName={companyName}
          welcome={tEn.welcome}
          welcomeDesc={tEn.welcomeDesc}
          selectLanguage={tEn.selectLanguage}
          languages={PREFERRED_LANGUAGES}
          onSelectLanguage={(lang) => {
            setLanguage(lang);
            setStep("details");
          }}
        />
      )}

      {step === "details" && (
        <InterviewDetailsForm
          companyName={companyName}
          language={language}
          form={form}
          formErrors={formErrors}
          loading={loading}
          error={chatError}
          t={t}
          engagement={engagement}
          onChange={setForm}
          onBack={() => setStep("language")}
          onSubmit={startInterview}
        />
      )}

      {step === "chat" && (
        <>
          <div className="border-b border-white/10 px-4 sm:px-6 py-3 bg-slate-950/70 backdrop-blur-sm shrink-0">
            <div className="max-w-6xl mx-auto">
              <LanguageBar
                selected={language}
                onSelect={changeLanguage}
                disabled={loading}
                compact
                label="Switch your language anytime"
              />
            </div>
          </div>
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-6xl mx-auto w-full">
            {chatError && (
              <p className="mb-4 text-sm text-red-300 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">
                {chatError}
              </p>
            )}
            <BilingualChat
              messages={messages.map(
                (msg): BilingualMessage => ({
                  role: msg.role,
                  contentEn: msg.contentEn,
                  contentLocale: msg.contentLocale,
                  attachments: msg.attachments?.map(renderAttachment),
                })
              )}
              preferredLanguage={language}
              thinking={loading}
              thinkingEn={tEn.thinking}
              thinkingLocale={t.thinking}
              engagement={engagement}
              participantName={form.fullName}
            />
            <div ref={bottomRef} />
          </main>

          <InterviewChatComposer
            input={input}
            setInput={setInput}
            onSend={sendMessage}
            onFileSelect={handleFileSelect}
            pendingFiles={pendingFiles}
            onRemoveFile={(id) => setPendingFiles((p) => p.filter((x) => x.id !== id))}
            loading={loading}
            uploading={uploading}
            sessionReady={!!sessionId}
            language={language}
            t={t}
            engagement={engagement}
            onQuickPrompt={setInput}
            onVoiceTextChange={setInput}
          />

          {remainingSeconds === 0 && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-2">
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2 text-center">
                Your allotted session time has ended. You may finish your current answer and complete the interview.
              </p>
            </div>
          )}

          {completionPct >= 85 && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-4 text-center">
              <button
                onClick={completeInterview}
                disabled={loading}
                className="text-xs text-amber-400 hover:text-amber-300 underline"
              >
                {t.finishReport}
              </button>
            </div>
          )}
        </>
      )}
    </InterviewShell>
  );
}
