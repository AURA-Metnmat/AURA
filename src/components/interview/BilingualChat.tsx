"use client";

import { memo } from "react";
import { Bot, User, Volume2 } from "lucide-react";
import { AudioPlayButton } from "@/components/interview/AudioPlayButton";
import { StructuredInteractionInput, type StructuredSelection } from "@/components/interview/StructuredInteractionInput";
import type { Language } from "@/lib/aura/i18n";
import { localeDisplayName } from "@/lib/aura/bilingual";
import { resolveMessageLocale } from "@/lib/aura/message-locale";
import type { EngagementStrings } from "@/lib/aura/engagement";
import type { MessageInteraction } from "@/lib/aura/interaction";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface BilingualMessage {
  role: "user" | "assistant";
  contentEn: string;
  contentLocale: string;
  interaction?: MessageInteraction | null;
  attachments?: ReactNode;
}

interface BilingualChatProps {
  messages: BilingualMessage[];
  preferredLanguage: Language;
  sessionId?: string | null;
  thinking?: boolean;
  thinkingEn?: string;
  thinkingLocale?: string;
  engagement?: EngagementStrings;
  participantName?: string;
  loading?: boolean;
  onStructuredSelect?: (selection: StructuredSelection) => void;
}

function isMessageAnswered(messages: BilingualMessage[], index: number): boolean {
  if (messages[index]?.role !== "assistant") return false;
  return messages[index + 1]?.role === "user";
}

interface BilingualBodyProps {
  contentEn: string;
  contentLocale: string;
  englishOnly: boolean;
  localeLabel: string;
  englishLabel: string;
  isUser: boolean;
}

function BilingualBody({
  contentEn,
  contentLocale,
  englishOnly,
  localeLabel,
  englishLabel,
  isUser,
}: BilingualBodyProps) {
  const localeText = contentLocale?.trim() || contentEn;
  const showDual = !englishOnly && localeText !== contentEn;

  if (!showDual) {
    return (
      <p
        className={cn(
          "text-[15px] leading-7 text-slate-200 whitespace-pre-wrap",
          isUser && "text-slate-100"
        )}
      >
        {contentEn}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3.5 min-h-[4rem]">
        <p className="text-[10px] uppercase tracking-wider text-amber-400/90 font-medium mb-2">
          {localeLabel}
        </p>
        <p className="text-[15px] leading-7 text-slate-100 whitespace-pre-wrap">{localeText}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 min-h-[4rem]">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">
          {englishLabel}
        </p>
        <p className="text-[15px] leading-7 text-slate-300 whitespace-pre-wrap">{contentEn}</p>
      </div>
    </div>
  );
}

interface ChatMessageRowProps {
  msg: BilingualMessage;
  index: number;
  messages: BilingualMessage[];
  preferredLanguage: Language;
  englishOnly: boolean;
  localeName: string;
  listenLabel: string;
  engagement?: EngagementStrings;
  participantName?: string;
  sessionId?: string | null;
  loading?: boolean;
  thinking?: boolean;
  onStructuredSelect?: (selection: StructuredSelection) => void;
}

const ChatMessageRow = memo(function ChatMessageRow({
  msg,
  index,
  messages,
  preferredLanguage,
  englishOnly,
  localeName,
  listenLabel,
  engagement,
  participantName,
  sessionId,
  loading,
  thinking,
  onStructuredSelect,
}: ChatMessageRowProps) {
  const localeText = resolveMessageLocale(
    msg.contentEn,
    msg.contentLocale,
    preferredLanguage,
    participantName
  );
  const answered = isMessageAnswered(messages, index);
  const isAssistant = msg.role === "assistant";
  const speakText = isAssistant && !englishOnly ? localeText : msg.contentEn;
  const speakLang = isAssistant && !englishOnly ? preferredLanguage : "en";

  const interactionBlock =
    isAssistant && msg.interaction && onStructuredSelect ? (
      <StructuredInteractionInput
        interaction={msg.interaction}
        preferredLanguage={preferredLanguage}
        disabled={loading || thinking}
        answered={answered}
        selectHint={engagement?.mcqSelectHint}
        orTypeHint={engagement?.mcqOrTypeHint}
        onSelect={onStructuredSelect}
      />
    ) : null;

  return (
    <div
      className={cn(
        "group w-full py-5 border-b border-white/[0.04]",
        isAssistant ? "bg-transparent" : "bg-white/[0.015]"
      )}
    >
      <div className="max-w-6xl mx-auto px-1 flex gap-4">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
            isAssistant ? "bg-amber-500/10 text-amber-400" : "bg-slate-800 text-slate-400"
          )}
        >
          {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0 space-y-2.5">
          <p className="text-[11px] font-medium text-slate-500">
            {isAssistant ? "AURA" : engagement?.youLabel ?? "You"}
          </p>

          <BilingualBody
            contentEn={msg.contentEn}
            contentLocale={isAssistant ? localeText : msg.contentLocale || msg.contentEn}
            englishOnly={englishOnly}
            localeLabel={engagement?.bilingualLocaleLabel ?? localeName}
            englishLabel={engagement?.bilingualEnglishLabel ?? "English"}
            isUser={!isAssistant}
          />

          {msg.attachments}

          {isAssistant && (
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <AudioPlayButton
                text={speakText}
                language={speakLang}
                sessionId={sessionId}
                label={listenLabel}
                autoPlay={false}
                className="!text-[11px] !px-2.5 !py-1"
              />
              {!englishOnly && (
                <span className="text-[10px] text-slate-600 flex items-center gap-1">
                  <Volume2 className="w-3 h-3" />
                  Hear in {localeName}
                </span>
              )}
            </div>
          )}

          {interactionBlock}
        </div>
      </div>
    </div>
  );
});

export function BilingualChat({
  messages,
  preferredLanguage,
  thinking,
  thinkingEn = "AURA is thinking...",
  thinkingLocale = "...",
  engagement,
  participantName,
  sessionId,
  loading,
  onStructuredSelect,
}: BilingualChatProps) {
  const englishOnly = preferredLanguage === "en";
  const listenLabel = engagement?.listenLabel ?? "Listen";
  const localeName = localeDisplayName(preferredLanguage);

  return (
    <div className="flex flex-col">
      {!englishOnly && messages.length > 0 && (
        <div className="max-w-6xl mx-auto w-full px-1 pb-2 hidden md:grid grid-cols-2 gap-4">
          <p className="text-[10px] uppercase tracking-wider text-amber-400/70 pl-12">
            {engagement?.bilingualLocaleLabel ?? localeName}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            {engagement?.bilingualEnglishLabel ?? "English"}
          </p>
        </div>
      )}

      {messages.map((msg, i) => (
        <ChatMessageRow
          key={`${msg.role}-${i}-${msg.contentEn.slice(0, 24)}`}
          msg={msg}
          index={i}
          messages={messages}
          preferredLanguage={preferredLanguage}
          englishOnly={englishOnly}
          localeName={localeName}
          listenLabel={listenLabel}
          engagement={engagement}
          participantName={participantName}
          sessionId={sessionId}
          loading={loading}
          thinking={thinking}
          onStructuredSelect={onStructuredSelect}
        />
      ))}

      {thinking && (
        <div className="w-full py-5 border-b border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-1 flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-4 h-4 text-amber-400" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-slate-500">{engagement?.auraTyping ?? thinkingEn}</p>
              <p className="text-sm text-slate-600">{englishOnly ? thinkingEn : thinkingLocale}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
