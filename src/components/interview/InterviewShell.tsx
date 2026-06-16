"use client";

import type { ReactNode } from "react";
import NeuralBackground from "@/components/ui/flow-field-background";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { cn } from "@/lib/utils";

interface InterviewShellProps {
  children: ReactNode;
  className?: string;
  background?: "neural" | "dotted";
}

export function InterviewShell({
  children,
  className,
  background = "neural",
}: InterviewShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-[#0a0a14] text-slate-100 flex flex-col relative overflow-hidden",
        className
      )}
    >
      {background === "dotted" ? (
        <>
          <DottedSurface className="opacity-90" />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 -z-0",
              "bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.08),transparent_55%)]"
            )}
          />
        </>
      ) : (
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <NeuralBackground color="#f59e0b" trailOpacity={0.08} particleCount={400} speed={0.6} />
        </div>
      )}
      <div className="relative z-10 flex flex-col min-h-screen">{children}</div>
    </div>
  );
}
