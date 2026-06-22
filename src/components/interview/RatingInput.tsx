"use client";

import { useState } from "react";
import type { RatingInteraction } from "@/lib/aura/interaction";
import { cn } from "@/lib/utils";

interface RatingInputProps {
  interaction: RatingInteraction;
  disabled?: boolean;
  answered?: boolean;
  selectHint?: string;
  onSubmit: (answerEn: string, answerLocale: string, value: number) => void;
}

export function RatingInput({
  interaction,
  disabled,
  answered,
  selectHint = "Rate from low to high",
  onSubmit,
}: RatingInputProps) {
  const min = interaction.min ?? 1;
  const max = interaction.max ?? 5;
  const [selected, setSelected] = useState<number | null>(null);
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-amber-400/80 font-medium px-0.5">
        {answered ? "Answer recorded" : selectHint}
      </p>
      {(interaction.minLabel || interaction.maxLabel) && (
        <div className="flex justify-between text-[11px] text-slate-500 px-0.5">
          <span>{interaction.minLabel ?? min}</span>
          <span>{interaction.maxLabel ?? max}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {values.map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled || answered}
            onClick={() => {
              setSelected(n);
              onSubmit(String(n), String(n), n);
            }}
            className={cn(
              "w-11 h-11 rounded-xl border text-sm font-semibold transition-all",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
              answered
                ? "border-white/5 bg-slate-900/40 text-slate-500 cursor-default"
                : selected === n
                  ? "border-amber-400 bg-amber-500/20 text-amber-200"
                  : "border-amber-500/25 bg-slate-900/60 text-slate-100 hover:border-amber-400/50 hover:bg-amber-500/10",
              disabled && !answered && "opacity-50 cursor-not-allowed"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
