"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InterviewShellProps {
  children: ReactNode;
  className?: string;
  /** Flat static background for chat — no motion or accent shifts */
  variant?: "default" | "chat";
}

export function InterviewShell({
  children,
  className,
  variant = "default",
}: InterviewShellProps) {
  return (
    <div
      className={cn(
        "h-dvh bg-[#09090f] text-slate-100 flex flex-col relative overflow-hidden",
        className
      )}
    >
      {variant === "chat" ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[#09090f]"
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
