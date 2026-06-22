"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InterviewShellProps {
  children: ReactNode;
  className?: string;
  /** Flat static background for chat — no motion or accent shifts */
  variant?: "default" | "chat" | "welcome" | "auth";
}

export function InterviewShell({
  children,
  className,
  variant = "default",
}: InterviewShellProps) {
  return (
    <div
      className={cn(
        "h-dvh flex flex-col relative overflow-hidden",
        variant === "auth" ? "bg-slate-950 text-slate-100" : "bg-[#09090f] text-slate-100",
        className
      )}
    >
      {variant === "chat" ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[#09090f]"
        />
      ) : variant === "auth" ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
        />
      ) : variant === "welcome" ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 50% at 50% 0%, rgba(245,158,11,0.06), transparent 55%),
              radial-gradient(ellipse 50% 40% at 100% 80%, rgba(245,158,11,0.03), transparent 50%),
              linear-gradient(180deg, #050508 0%, #09090f 50%, #050508 100%)
            `,
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #09090f 0%, #0c0c14 50%, #09090f 100%)",
          }}
        />
      )}
      <div className="relative z-10 flex flex-col h-full min-h-0">{children}</div>
    </div>
  );
}
