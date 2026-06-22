"use client";

import type { YesNoInteraction } from "@/lib/aura/interaction";
import { cn } from "@/lib/utils";

interface YesNoOptionsProps {
  interaction: YesNoInteraction;
  disabled?: boolean;
  answered?: boolean;
  selectHint?: string;
  onSelect: (answerEn: string, answerLocale: string, value: boolean) => void;
}

export function YesNoOptions({
  disabled,
  answered,
  selectHint = "Choose yes or no",
  onSelect,
}: YesNoOptionsProps) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-amber-400/80 font-medium px-0.5">
        {answered ? "Answer recorded" : selectHint}
      </p>
      <div className="flex gap-2">
        {[
          { label: "Yes", value: true },
          { label: "No", value: false },
        ].map(({ label, value }) => (
          <button
            key={label}
            type="button"
            disabled={disabled || answered}
            onClick={() => onSelect(label, label, value)}
            className={cn(
              "flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
              answered
                ? "border-white/5 bg-slate-900/40 text-slate-500 cursor-default"
                : "border-amber-500/25 bg-slate-900/60 text-slate-100 hover:border-amber-400/50 hover:bg-amber-500/10",
              disabled && !answered && "opacity-50 cursor-not-allowed"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
