"use client";

import { LANGUAGES, type Language } from "@/lib/aura/i18n";
import { cn } from "@/lib/utils";

interface LanguageBarProps {
  selected: Language;
  onSelect: (lang: Language) => void;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
}

export function LanguageBar({
  selected,
  onSelect,
  disabled,
  compact,
  label = "Your language",
}: LanguageBarProps) {
  return (
    <div className="space-y-2">
      {!compact && (
        <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      )}
      <div
        className={cn(
          "flex flex-wrap gap-2",
          compact ? "justify-end" : "justify-center sm:justify-start"
        )}
      >
        {LANGUAGES.map((lang) => {
          const active = selected === lang.id;
          return (
            <button
              key={lang.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(lang.id)}
              className={cn(
                "rounded-xl border px-3 py-2 transition-all text-left min-w-[4.5rem]",
                compact ? "px-2.5 py-1.5" : "px-4 py-3",
                active
                  ? "border-amber-500/70 bg-amber-500/15 shadow-sm shadow-amber-500/10"
                  : "border-white/10 bg-slate-900/50 hover:border-amber-500/40 hover:bg-amber-500/5",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <p
                className={cn(
                  "font-semibold leading-tight",
                  compact ? "text-xs" : "text-sm",
                  active ? "text-amber-300" : "text-slate-200"
                )}
              >
                {lang.native}
              </p>
              {!compact && (
                <p className="text-[10px] text-slate-500 mt-0.5">{lang.label}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
