"use client";

import { useRef } from "react";
import { Paperclip, Send, Loader2, X } from "lucide-react";
import { VoiceInputButton } from "@/components/interview/VoiceInputButton";
import { QuickReplyBar } from "@/components/interview/QuickReplyBar";
import type { Language, UiStrings } from "@/lib/aura/i18n";
import type { EngagementStrings } from "@/lib/aura/engagement";
import type { QuickReplyOption } from "@/lib/aura/quick-replies";
import { cn } from "@/lib/utils";

interface Attachment {
  id: string;
  fileName: string;
}

interface InterviewChatComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  pendingFiles: Attachment[];
  onRemoveFile: (id: string) => void;
  loading: boolean;
  uploading: boolean;
  sessionReady: boolean;
  language: Language;
  t: UiStrings;
  engagement: EngagementStrings;
  onVoiceTextChange: (text: string) => void;
  onVoiceSubmit?: (text: string) => void;
  quickReplies?: QuickReplyOption[];
  onQuickSend?: (text: string) => void;
  onQuickPrefill?: (text: string) => void;
}

export function InterviewChatComposer({
  input,
  setInput,
  onSend,
  onFileSelect,
  pendingFiles,
  onRemoveFile,
  loading,
  uploading,
  sessionReady,
  language,
  t,
  engagement,
  onVoiceTextChange,
  onVoiceSubmit,
  quickReplies = [],
  onQuickSend,
  onQuickPrefill,
}: InterviewChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSend = !loading && (input.trim().length > 0 || pendingFiles.length > 0);

  return (
    <footer className="border-t border-white/[0.06] bg-[#09090f] px-4 sm:px-6 py-3 shrink-0">
      <div className="max-w-6xl mx-auto">
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {pendingFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2 bg-slate-800/80 border border-white/10 rounded-lg px-3 py-1.5 text-xs"
              >
                <Paperclip className="w-3 h-3 text-amber-400" />
                <span className="truncate max-w-[140px]">{f.fileName}</span>
                <button
                  type="button"
                  onClick={() => onRemoveFile(f.id)}
                  className="text-slate-500 hover:text-red-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {quickReplies.length > 0 && onQuickSend && onQuickPrefill && (
          <QuickReplyBar
            options={quickReplies}
            disabled={loading || !sessionReady}
            hint={engagement.quickRepliesHint}
            onSend={onQuickSend}
            onPrefill={onQuickPrefill}
            onAttach={() => fileInputRef.current?.click()}
          />
        )}

        <form onSubmit={onSend}>
          <div className="flex gap-2 sm:gap-3 items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.xlsx,.xls,.doc,.docx,.txt,.csv"
              multiple
              className="hidden"
              onChange={(e) => {
                onFileSelect(e);
                e.target.value = "";
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploading || !sessionReady}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/5 disabled:opacity-40 transition-colors"
              title={engagement.dropFilesHint}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <Paperclip className="w-4 h-4 text-slate-400" />
              )}
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend(e);
                }
              }}
              placeholder={t.typeResponse}
              disabled={loading}
              rows={1}
              className={cn(
                "flex-1 bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-3 text-sm",
                "focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/15",
                "disabled:opacity-50 resize-none min-h-[48px] max-h-32"
              )}
            />

            <VoiceInputButton
              language={language}
              baseText={input}
              onTextChange={onVoiceTextChange}
              disabled={loading || !sessionReady}
              prominent
              labels={{
                speakAnswer: engagement.speakAnswer,
                listening: engagement.listening,
                stopListening: engagement.stopListening,
                micUnsupported: engagement.micUnsupported,
              }}
            />

            <button
              type="submit"
              disabled={!canSend}
              className="shrink-0 w-12 h-12 flex items-center justify-center bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 rounded-xl transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          <p className="text-[10px] text-slate-600 text-center mt-2.5">
            {engagement.quickRepliesHint} · {engagement.voiceOrTypeHint}
          </p>
        </form>
      </div>
    </footer>
  );
}
