"use client";

import { useRef } from "react";
import type { QuickReplyOption } from "@/lib/aura/quick-replies";
import { cn } from "@/lib/utils";

interface QuickReplyBarProps {
  options: QuickReplyOption[];
  disabled?: boolean;
  hint?: string;
  onSend: (message: string) => void;
  onPrefill: (message: string) => void;
  onAttach: () => void;
}

export function QuickReplyBar({
  options,
  disabled,
  hint,
  onSend,
  onPrefill,
  onAttach,
}: QuickReplyBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (options.length === 0) return null;

  function handleSelect(option: QuickReplyOption) {
    if (disabled) return;
    switch (option.action) {
      case "send":
        onSend(option.message);
        break;
      case "prefill":
        onPrefill(option.message);
        break;
      case "attach":
        onAttach();
        break;
      default: {
        const _exhaustive: never = option.action;
        void _exhaustive;
      }
    }
  }

  return (
    <div className="mb-2.5">
      {hint && (
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2 px-0.5">
          {hint}
        </p>
      )}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
        role="toolbar"
        aria-label={hint ?? "Quick replies"}
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => handleSelect(option)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium",
              "transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40",
              disabled
                ? "border-white/5 bg-slate-900/40 text-slate-600 cursor-not-allowed"
                : [
                    "border-amber-500/25 bg-slate-900/70 text-slate-200",
                    "hover:border-amber-400/45 hover:bg-amber-500/10 hover:text-amber-50",
                    "active:scale-[0.98]",
                  ]
            )}
          >
            {option.emoji && (
              <span className="text-sm leading-none" aria-hidden>
                {option.emoji}
              </span>
            )}
            <span className="whitespace-nowrap max-w-[200px] sm:max-w-none truncate">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
