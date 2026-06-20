"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { PREFERRED_LANGUAGES, UI, SECTION_NAMES, type Language } from "@/lib/aura/i18n";
import { getEngagement } from "@/lib/aura/engagement";
import { resolveMessageLocale } from "@/lib/aura/message-locale";
import { InterviewWelcome } from "@/components/interview/InterviewWelcome";
import { InterviewShell } from "@/components/interview/InterviewShell";
import { LanguageBar } from "@/components/interview/LanguageBar";
import { BilingualChat, type BilingualMessage } from "@/components/interview/BilingualChat";
import { InterviewChatComposer } from "@/components/interview/InterviewChatComposer";
import { EmployeeAuthPanel } from "@/components/interview/EmployeeAuthPanel";
import type { MessageInteraction } from "@/lib/aura/interaction";

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
  interaction?: MessageInteraction | null;
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

type FlowStep = "language" | "auth" | "chat";

export default function InterviewFlow({
  companyId,
  companyName,
  interviewDurationMinutes: initialDurationMinutes = 5,
  showCompanyBadge = true,
}: InterviewFlowProps) {
  const [step, setStep] = useState<FlowStep>("language");
  const [language, setLanguage] = useState<Language>("en");
  const [authChecked, setAuthChecked] = useState(false);
  const [form, setForm] = useState<ParticipantForm>({
    fullName: "",
    designation: "",
    department: "",
    mobile: "",
    email: "",
  });
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
    const el = bottomRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      try {
        const res = await fetch(`/api/employees/me?company_id=${encodeURIComponent(companyId)}`);
        const data = await res.json();
        if (cancelled || !data.authenticated) {
          setAuthChecked(true);
          return;
        }

        setForm({
          fullName: data.employee.employee_name ?? "",
          designation: data.employee.designation ?? "",
          department: data.employee.department ?? "",
          mobile: data.employee.mobile_number ?? "",
          email: data.employee.email ?? "",
        });

        if (data.active_session) {
          hydrateSession(data.active_session, data.employee.employee_name);
          setStep("chat");
        }
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }
    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  function hydrateSession(
    active: {
      sessionId: string;
      language: Language;
      currentSection: string;
      completionPct: number;
      interviewDurationMinutes: number;
      messages: Message[];
      participant: ParticipantForm;
      startedAt: string;
    },
    fallbackName?: string
  ) {
    setSessionId(active.sessionId);
    setLanguage(active.language);
    setMessages(active.messages);
    setCurrentSection(active.currentSection);
    setCompletionPct(active.completionPct);
    setSessionDurationMinutes(active.interviewDurationMinutes);
    setSessionStartedAt(new Date(active.startedAt).getTime());
    setForm({
      fullName: active.participant.fullName || fallbackName || "",
      designation: active.participant.designation,
      department: active.participant.department,
      mobile: active.participant.mobile,
      email: active.participant.email,
    });
  }

  async function handleRegistered(profile: ParticipantForm) {
    setForm(profile);
    await startInterview(profile);
  }

  async function handleLoggedIn(payload: {
    form: ParticipantForm;
    activeSession: {
      sessionId: string;
      language: Language;
      currentSection: string;
      completionPct: number;
      interviewDurationMinutes: number;
      messages: Message[];
      participant: ParticipantForm;
      startedAt: string;
    } | null;
  }) {
    setForm(payload.form);
    if (payload.activeSession) {
      hydrateSession(payload.activeSession, payload.form.fullName);
      setStep("chat");
      return;
    }
    await startInterview(payload.form);
  }

  async function handleLogout() {
    await fetch("/api/employees/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId }),
    });
    setSessionId(null);
    setMessages([]);
    setStep("auth");
  }

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

  async function startInterview(profileOverride?: ParticipantForm) {
    const profile = profileOverride ?? form;
    if (!profile.fullName.trim() || !profile.designation.trim() || !profile.department.trim()) {
      setChatError("Please complete your profile before starting.");
      return;
    }
    const normalizedMobile = profile.mobile.replace(/\D/g, "").slice(-10);
    if (!/^\d{10}$/.test(normalizedMobile)) {
      setChatError(t.invalidMobile);
      return;
    }

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
            fullName: profile.fullName.trim(),
            designation: profile.designation.trim(),
            department: profile.department.trim(),
            mobile: profile.mobile.replace(/\D/g, "").slice(-10),
            email: profile.email.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.resumed && Array.isArray(data.messages)) {
        setSessionId(data.sessionId);
        setMessages(
          data.messages.map((m: Message) => ({
            role: m.role,
            contentEn: m.contentEn,
            contentLocale: m.contentLocale,
            interaction: m.interaction ?? null,
          }))
        );
        setLanguage(data.language ?? language);
        setCurrentSection(data.currentSection);
        setCompletionPct(data.completionPct);
        if (typeof data.interviewDurationMinutes === "number") {
          setSessionDurationMinutes(data.interviewDurationMinutes);
        }
        setSessionStartedAt(
          data.startedAt ? new Date(data.startedAt).getTime() : Date.now()
        );
        setStep("chat");
        return;
      }

      setSessionId(data.sessionId);
      setMessages([
        {
          role: "assistant",
          contentEn: data.message,
          contentLocale: resolveMessageLocale(
            data.message,
            data.messageLocale ?? data.message,
            language,
            profile.fullName.trim()
          ),
        },
      ]);
      setForm(profile);
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

  async function submitUserAnswer(userMsg: string, msgAttachments: Attachment[] = []) {
    if (!sessionId) return;
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
            interaction: data.interaction ?? null,
          },
        ];
      });
      setCurrentSection(data.currentSection);
      setCompletionPct(data.completionPct);
      if (data.shouldComplete) await completeInterview();
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Failed to send message. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && pendingFiles.length === 0) || loading || !sessionId) return;
    const userMsg = input.trim() || `📎 ${pendingFiles.map((f) => f.fileName).join(", ")}`;
    const msgAttachments = [...pendingFiles];
    setInput("");
    setPendingFiles([]);
    await submitUserAnswer(userMsg, msgAttachments);
  }

  async function handleMcqSelect(answerEn: string, answerLocale: string) {
    if (loading || !sessionId) return;
    const display =
      language === "en" ? answerEn : answerLocale || answerEn;
    await submitUserAnswer(display);
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

  if (!authChecked) {
    return (
      <InterviewShell>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 text-sm">Loading your profile…</p>
        </div>
      </InterviewShell>
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
    <InterviewShell variant={step === "chat" ? "chat" : "default"}>
      <header className="border-b border-white/[0.06] px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 bg-[#09090f]/95">
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-400">AURA-METNMAT Interview</p>
          <h1 className="text-lg font-semibold">{showCompanyBadge ? companyName : form.fullName || "Interview"}</h1>
        </div>
        <div className="flex items-center gap-3">
          {step === "chat" && form.mobile && (
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg border border-white/10"
            >
              Log out
            </button>
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
            setStep("auth");
          }}
        />
      )}

          {step === "auth" && (
        <EmployeeAuthPanel
          companyName={companyName}
          companyId={companyId}
          onBack={() => setStep("language")}
          onRegistered={handleRegistered}
          onLoggedIn={handleLoggedIn}
        />
      )}

      {step === "chat" && (
        <>
          <div className="border-b border-white/[0.06] px-4 sm:px-6 py-2 bg-[#09090f] shrink-0">
            <div className="max-w-3xl mx-auto">
              <LanguageBar
                selected={language}
                onSelect={changeLanguage}
                disabled={loading}
                compact
                label="Language"
              />
            </div>
          </div>
          <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
            <div className="max-w-3xl mx-auto">
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
                    interaction: msg.interaction,
                    attachments: msg.attachments?.map(renderAttachment),
                  })
                )}
                preferredLanguage={language}
                thinking={loading}
                thinkingEn={tEn.thinking}
                thinkingLocale={t.thinking}
                engagement={engagement}
                participantName={form.fullName}
                loading={loading}
                onMcqSelect={(en, locale) => void handleMcqSelect(en, locale)}
              />
              <div ref={bottomRef} className="h-1" />
            </div>
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
            onVoiceTextChange={setInput}
          />

          {remainingSeconds === 0 && (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-2 shrink-0">
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2 text-center">
                Your allotted session time has ended. You may finish your current answer and complete the interview.
              </p>
            </div>
          )}

          {completionPct >= 85 && (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-3 text-center shrink-0">
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
