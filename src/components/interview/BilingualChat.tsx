"use client";

import type { ReactNode } from "react";
import { Bot, User, Sparkles } from "lucide-react";
import { AudioPlayButton } from "@/components/interview/AudioPlayButton";
import type { Language } from "@/lib/aura/i18n";
import { PREFERRED_LANGUAGES } from "@/lib/aura/i18n";
import { localeDisplayName } from "@/lib/aura/bilingual";
import { resolveMessageLocale } from "@/lib/aura/message-locale";
import type { EngagementStrings } from "@/lib/aura/engagement";
import { cn } from "@/lib/utils";

export interface BilingualMessage {
  role: "user" | "assistant";
  contentEn: string;
  contentLocale: string;
  attachments?: ReactNode;
}

interface BilingualChatProps {
  messages: BilingualMessage[];
  preferredLanguage: Language;
  thinking?: boolean;
  thinkingEn?: string;
  thinkingLocale?: string;
  engagement?: EngagementStrings;
  participantName?: string;
}

function MessageColumn({
  label,
  lang,
  text,
  isUser,
  attachments,
}: {
  label: string;
  lang: Language;
  text: string;
  isUser: boolean;
  attachments?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex-1 min-w-0 rounded-2xl px-4 py-3.5 text-sm leading-relaxed shadow-sm",
        isUser
          ? "bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950"
          : "bg-slate-800/80 text-slate-100 border border-white/10 backdrop-blur-sm"
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={cn(
            "text-[10px] uppercase tracking-wider font-medium",
            isUser ? "text-slate-900/60" : "text-slate-400"
          )}
        >
          {label}
        </span>
        <AudioPlayButton text={text} language={lang} label="Listen" />
      </div>
      <p className="whitespace-pre-wrap">{text}</p>
      {attachments}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 ml-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

export function BilingualChat({
  messages,
  preferredLanguage,
  thinking,
  thinkingEn = "AURA is thinking...",
  thinkingLocale = "...",
  engagement,
  participantName,
}: BilingualChatProps) {
  const prefMeta = PREFERRED_LANGUAGES.find((l) => l.id === preferredLanguage);
  const prefLabel = prefMeta?.native ?? localeDisplayName(preferredLanguage);
  const englishOnly = preferredLanguage === "en";

  return (
    <div className="space-y-8">
      {messages.length === 1 && messages[0]?.role === "assistant" && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-200">Let&apos;s make this easy</p>
            <p className="text-xs text-slate-400">
              {englishOnly
                ? "Answer naturally — type, speak, or upload files. AURA will ask friendly follow-ups in English."
                : "Answer naturally — type, speak, or upload files. AURA will ask friendly follow-ups."}
            </p>
          </div>
        </div>
      )}

      {messages.map((msg, i) => {
        const localeText = resolveMessageLocale(
          msg.contentEn,
          msg.contentLocale,
          preferredLanguage,
          participantName
        );

        return (
        <div key={i} className="space-y-3">
          <div
            className={cn(
              "flex items-center gap-2 px-1",
              msg.role === "user" && "flex-row-reverse"
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                msg.role === "assistant"
                  ? "bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-500/30"
                  : "bg-slate-800 border border-white/10"
              )}
            >
              {msg.role === "assistant" ? (
                <Bot className="w-4 h-4 text-amber-400" />
              ) : (
                <User className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <span className="text-xs font-medium text-slate-500">
              {msg.role === "assistant" ? "AURA" : engagement?.youLabel ?? "You"}
            </span>
          </div>

          {englishOnly ? (
            <MessageColumn
              label="English"
              lang="en"
              text={msg.contentEn}
              isUser={msg.role === "user"}
              attachments={msg.role === "user" ? msg.attachments : undefined}
            />
          ) : (
            <div
              className={cn(
                "grid grid-cols-1 md:grid-cols-2 gap-3",
                msg.role === "user" && "md:[direction:rtl]"
              )}
            >
              <div className={msg.role === "user" ? "md:[direction:ltr]" : undefined}>
                <MessageColumn
                  label="English"
                  lang="en"
                  text={msg.contentEn}
                  isUser={msg.role === "user"}
                  attachments={msg.role === "user" ? msg.attachments : undefined}
                />
              </div>
              <div className={msg.role === "user" ? "md:[direction:ltr]" : undefined}>
                <MessageColumn
                  label={prefLabel}
                  lang={preferredLanguage}
                  text={localeText}
                  isUser={msg.role === "user"}
                  attachments={undefined}
                />
              </div>
            </div>
          )}
        </div>
        );
      })}

      {thinking && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <span className="text-xs text-amber-400/80">
              {engagement?.auraTyping ?? thinkingEn}
              <TypingDots />
            </span>
          </div>
          {englishOnly ? (
            <div className="rounded-2xl px-4 py-3 text-sm text-slate-500 bg-slate-800/40 border border-white/5">
              {thinkingEn}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl px-4 py-3 text-sm text-slate-500 bg-slate-800/40 border border-white/5">
                {thinkingEn}
              </div>
              <div className="rounded-2xl px-4 py-3 text-sm text-slate-500 bg-slate-800/40 border border-white/5">
                {thinkingLocale}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
