"use client";

import type { McqInteraction } from "@/lib/aura/interaction";
import type { Language } from "@/lib/aura/i18n";
import { cn } from "@/lib/utils";

interface McqOptionsProps {
  interaction: McqInteraction;
  preferredLanguage: Language;
  disabled?: boolean;
  answered?: boolean;
  selectHint?: string;
  orTypeHint?: string;
  onSelect: (answerEn: string, answerLocale: string, optionId: string) => void;
}

export function McqOptions({
  interaction,
  preferredLanguage,
  disabled,
  answered,
  selectHint = "Tap an option to answer",
  orTypeHint = "Or type your own answer below",
  onSelect,
}: McqOptionsProps) {
  if (interaction.type !== "mcq" || interaction.options.length === 0) {
    return null;
  }

  const englishOnly = preferredLanguage === "en";

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-amber-400/80 font-medium px-0.5">
        {answered ? "Answer recorded" : selectHint}
      </p>
      <div className="flex flex-col gap-2">
        {interaction.options.map((opt, index) => {
          const localeLabel = opt.locale || opt.en;
          const showDual = !englishOnly && localeLabel !== opt.en;

          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled || answered}
              onClick={() => onSelect(opt.en, opt.locale || opt.en, opt.id)}
              className={cn(
                "group w-full text-left rounded-xl border px-4 py-3 text-sm transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
                answered
                  ? "border-white/5 bg-slate-900/40 text-slate-500 cursor-default"
                  : "border-amber-500/25 bg-slate-900/60 text-slate-100 hover:border-amber-400/50 hover:bg-amber-500/10 hover:shadow-md hover:shadow-amber-500/5 active:scale-[0.99]",
                disabled && !answered && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="inline-flex items-start gap-3 w-full">
                <span
                  className={cn(
                    "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold border mt-0.5",
                    answered
                      ? "border-white/10 text-slate-500"
                      : "border-amber-500/30 text-amber-300 group-hover:bg-amber-500/20"
                  )}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                {showDual ? (
                  <span className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                    <span className="leading-snug text-slate-100">{localeLabel}</span>
                    <span className="leading-snug text-slate-400 text-[13px]">{opt.en}</span>
                  </span>
                ) : (
                  <span className="leading-snug flex-1">{opt.en}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {interaction.allowFreeText !== false && !answered && (
        <p className="text-[11px] text-slate-500 px-0.5">{orTypeHint}</p>
      )}
    </div>
  );
}
