"use client";

import { useState } from "react";
import type { NumericInteraction } from "@/lib/aura/interaction";
import { cn } from "@/lib/utils";

interface NumericInputProps {
  interaction: NumericInteraction;
  disabled?: boolean;
  answered?: boolean;
  selectHint?: string;
  submitLabel?: string;
  onSubmit: (answerEn: string, answerLocale: string, value: number) => void;
}

export function NumericInput({
  interaction,
  disabled,
  answered,
  selectHint = "Enter a number",
  submitLabel = "Submit",
  onSubmit,
}: NumericInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    const num = Number(trimmed);
    if (Number.isNaN(num)) return;
    const display = interaction.unit ? `${trimmed} ${interaction.unit}` : trimmed;
    onSubmit(display, display, num);
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-amber-400/80 font-medium px-0.5">
        {answered ? "Answer recorded" : selectHint}
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          disabled={disabled || answered}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={interaction.placeholder ?? "0"}
          className={cn(
            "flex-1 rounded-xl border border-amber-500/25 bg-slate-900/60 px-4 py-3 text-sm text-slate-100",
            "placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
            (disabled || answered) && "opacity-50 cursor-not-allowed"
          )}
        />
        {interaction.unit && (
          <span className="flex items-center text-sm text-slate-400 px-1">{interaction.unit}</span>
        )}
        <button
          type="button"
          disabled={disabled || answered || !value.trim()}
          onClick={handleSubmit}
          className={cn(
            "rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200",
            "hover:bg-amber-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
            (disabled || answered || !value.trim()) && "opacity-50 cursor-not-allowed"
          )}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
