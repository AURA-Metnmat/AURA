"use client";

import { Bot, User, Volume2 } from "lucide-react";
import { AudioPlayButton } from "@/components/interview/AudioPlayButton";
import { McqOptions } from "@/components/interview/McqOptions";
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
  thinking?: boolean;
  thinkingEn?: string;
  thinkingLocale?: string;
  engagement?: EngagementStrings;
  participantName?: string;
  loading?: boolean;
  onMcqSelect?: (answerEn: string, answerLocale: string) => void;
}

function isMessageAnswered(messages: BilingualMessage[], index: number): boolean {
  if (messages[index]?.role !== "assistant") return false;
  return messages[index + 1]?.role === "user";
}

export function BilingualChat({
  messages,
  preferredLanguage,
  thinking,
  thinkingEn = "AURA is thinking...",
  thinkingLocale = "...",
  engagement,
  participantName,
  loading,
  onMcqSelect,
}: BilingualChatProps) {
  const englishOnly = preferredLanguage === "en";
  const listenLabel = engagement?.listenLabel ?? "Listen";
  const localeName = localeDisplayName(preferredLanguage);

  return (
    <div className="flex flex-col">
      {messages.map((msg, i) => {
        const localeText = resolveMessageLocale(
          msg.contentEn,
          msg.contentLocale,
          preferredLanguage,
          participantName
        );
        const answered = isMessageAnswered(messages, i);
        const isAssistant = msg.role === "assistant";
        const displayText = msg.contentEn;
        const speakText = isAssistant && !englishOnly ? localeText : displayText;
        const speakLang = isAssistant && !englishOnly ? preferredLanguage : "en";

        const mcqBlock =
          isAssistant && msg.interaction?.type === "mcq" && onMcqSelect ? (
            <McqOptions
              interaction={msg.interaction}
              preferredLanguage={preferredLanguage}
              disabled={loading || thinking}
              answered={answered}
              selectHint={engagement?.mcqSelectHint}
              orTypeHint={engagement?.mcqOrTypeHint}
              onSelect={onMcqSelect}
            />
          ) : null;

        return (
          <div
            key={i}
            className={cn(
              "group w-full py-5 border-b border-white/[0.04]",
              isAssistant ? "bg-transparent" : "bg-white/[0.015]"
            )}
          >
            <div className="max-w-3xl mx-auto px-1 flex gap-4">
              <div
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                  isAssistant
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-slate-800 text-slate-400"
                )}
              >
                {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-[11px] font-medium text-slate-500">
                  {isAssistant ? "AURA" : engagement?.youLabel ?? "You"}
                </p>

                <div
                  className={cn(
                    "text-[15px] leading-7 text-slate-200 whitespace-pre-wrap",
                    !isAssistant && "text-slate-100"
                  )}
                >
                  {displayText}
                </div>

                {msg.attachments}

                {isAssistant && (
                  <div className="flex items-center gap-3 pt-1">
                    <AudioPlayButton
                      text={speakText}
                      language={speakLang}
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

                {mcqBlock}
              </div>
            </div>
          </div>
        );
      })}

      {thinking && (
        <div className="w-full py-5 border-b border-white/[0.04]">
          <div className="max-w-3xl mx-auto px-1 flex gap-4">
            <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-amber-400" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-slate-500">{engagement?.auraTyping ?? thinkingEn}</p>
              <p className="text-sm text-slate-600">{thinkingEn}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
