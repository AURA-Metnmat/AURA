"use client";

import { useRef } from "react";
import {
  Paperclip,
  Send,
  Loader2,
  AlertCircle,
  Upload,
  HelpCircle,
  Lightbulb,
  X,
} from "lucide-react";
import { VoiceInputButton } from "@/components/interview/VoiceInputButton";
import type { PreferredLanguage, UiStrings } from "@/lib/aura/i18n";
import type { EngagementStrings } from "@/lib/aura/engagement";
import { PREFERRED_LANGUAGES } from "@/lib/aura/i18n";
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
  language: PreferredLanguage;
  t: UiStrings;
  engagement: EngagementStrings;
  onQuickPrompt: (text: string) => void;
  onVoiceTranscript: (text: string) => void;
}

const QUICK_PROMPT_KEYS = [
  "havingIssue",
  "uploadDocs",
  "needClarification",
  "shareKnowledge",
] as const;

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
  onQuickPrompt,
  onVoiceTranscript,
}: InterviewChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefLabel = PREFERRED_LANGUAGES.find((l) => l.id === language)?.native ?? language;

  return (
    <footer className="border-t border-white/10 bg-slate-950/90 backdrop-blur-xl px-4 sm:px-6 py-4 shrink-0">
      <div className="max-w-6xl mx-auto space-y-3">
        <div className="flex items-start gap-2 rounded-xl bg-amber-500/5 border border-amber-500/15 px-3 py-2">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-400 leading-relaxed">
            <p>{engagement.chatCoachTip}</p>
            <p className="text-slate-500 mt-0.5">{engagement.beSpecificTip}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              disabled={loading}
              onClick={() => {
                if (key === "uploadDocs") {
                  fileInputRef.current?.click();
                } else {
                  onQuickPrompt(engagement[key]);
                }
              }}
              className={cn(
                "text-[11px] px-3 py-1.5 rounded-full border transition-colors",
                key === "havingIssue"
                  ? "border-red-500/30 text-red-300/90 hover:bg-red-500/10"
                  : "border-slate-600 text-slate-400 hover:border-amber-500/40 hover:text-amber-300/90"
              )}
            >
              {key === "havingIssue" && <AlertCircle className="w-3 h-3 inline mr-1 -mt-0.5" />}
              {key === "needClarification" && <HelpCircle className="w-3 h-3 inline mr-1 -mt-0.5" />}
              {key === "uploadDocs" && <Upload className="w-3 h-3 inline mr-1 -mt-0.5" />}
              {engagement[key]}
            </button>
          ))}
        </div>

        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
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

        <form onSubmit={onSend} className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 px-1 flex items-center gap-2">
            <span>Type or speak in {prefLabel}</span>
            <span className="text-slate-700">·</span>
            <span className="text-slate-600">{engagement.dropFilesHint}</span>
          </p>

          <div className="flex gap-2 items-end">
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
              className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl border border-slate-600 hover:border-amber-500 hover:bg-amber-500/10 disabled:opacity-50 transition-colors"
              title={engagement.dropFilesHint}
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
              ) : (
                <Paperclip className="w-5 h-5 text-slate-300" />
              )}
            </button>

            <VoiceInputButton
              language={language}
              onTranscript={onVoiceTranscript}
              disabled={loading || !sessionReady}
              labels={{
                speakAnswer: engagement.speakAnswer,
                listening: engagement.listening,
                stopListening: engagement.stopListening,
                micUnsupported: engagement.micUnsupported,
              }}
            />

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
              rows={2}
              className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 disabled:opacity-50 resize-none min-h-[3rem]"
            />

            <button
              type="submit"
              disabled={loading || (!input.trim() && pendingFiles.length === 0)}
              className="shrink-0 h-12 px-5 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">{t.send}</span>
            </button>
          </div>
        </form>
      </div>
    </footer>
  );
}
