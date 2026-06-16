"use client";

import type { ReactNode } from "react";
import NeuralBackground from "@/components/ui/flow-field-background";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { cn } from "@/lib/utils";

interface InterviewShellProps {
  children: ReactNode;
  className?: string;
  background?: "neural" | "dotted";
  /** Accent for neural flow lines and ambient glow */
  accentColor?: string;
}

export function InterviewShell({
  children,
  className,
  background = "neural",
  accentColor = "#f59e0b",
}: InterviewShellProps) {
  const glowRgb = (() => {
    const c = accentColor.toLowerCase();
    if (c === "#3b82f6" || c === "#2563eb") return "37,99,235";
    if (c === "#b91c1c" || c === "#dc2626" || c === "#991b1b") return "185,28,28";
    return "245,158,11";
  })();

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
        <>
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <NeuralBackground
              color={accentColor}
              trailOpacity={0.07}
              particleCount={400}
              speed={0.55}
            />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-0"
            style={{
              background: `radial-gradient(ellipse at 50% 20%, rgba(${glowRgb}, 0.12), transparent 55%)`,
            }}
          />
        </>
      )}
      <div className="relative z-10 flex flex-col min-h-screen">{children}</div>
    </div>
  );
}
