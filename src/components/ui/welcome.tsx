"use client";

import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Check, Languages, Sparkles } from "lucide-react";
import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

const AURA_CONFETTI_COLORS = ["#f59e0b", "#fbbf24", "#34d399", "#38bdf8", "#f1f5f9"];

export interface InterviewCompleteWelcomeProps {
  companyName: string;
  participantName?: string;
  phase1Title?: string;
  phase2Title?: string;
  onContinue: () => void;
  loading?: boolean;
  continueLabel?: string;
  className?: string;
}

export function InterviewCompleteWelcome({
  companyName,
  participantName,
  phase1Title = "AI Discovery",
  phase2Title = "Domain Questions",
  onContinue,
  loading = false,
  continueLabel = "Continue — next employee",
  className,
}: InterviewCompleteWelcomeProps) {
  const confettiFired = useRef(false);

  const canvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || confettiFired.current) return;
    confettiFired.current = true;

    const myConfetti = confetti.create(canvas, {
      resize: true,
      useWorker: true,
    });

    const fireBurst = (originX: number, delayMs: number) => {
      window.setTimeout(() => {
        void myConfetti({
          particleCount: originX === 0.5 ? 100 : 45,
          spread: originX === 0.5 ? 80 : 95,
          startVelocity: 38,
          origin: { y: 0.58, x: originX },
          colors: AURA_CONFETTI_COLORS,
          ticks: 220,
          gravity: 0.9,
          scalar: 0.95,
        });
      }, delayMs);
    };

    fireBurst(0.5, 0);
    fireBurst(0.18, 450);
    fireBurst(0.82, 450);
    fireBurst(0.5, 1100);
  }, []);

  const firstName = participantName?.trim().split(/\s+/)[0];

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4",
        className
      )}
      role="dialog"
      aria-labelledby="aura-interview-complete-title"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-[#020617]/92 backdrop-blur-md" aria-hidden />

      <motion.div
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        aria-hidden
      />

      <canvas
        className="pointer-events-none absolute inset-0 h-full w-full"
        ref={canvasRef}
        style={{ zIndex: 10 }}
        aria-hidden
      />

      <motion.div
        className="relative z-20 w-full max-w-md"
        initial={{ opacity: 0, y: 28, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-slate-900/95 to-slate-950 p-8 shadow-2xl shadow-emerald-950/30 text-center">
          <motion.div
            className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
          >
            <motion.span
              className="absolute inset-0 rounded-full border border-emerald-400/30"
              animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
              aria-hidden
            />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-400/40">
              <Check className="h-8 w-8 text-emerald-400" strokeWidth={2.5} aria-hidden />
            </div>
          </motion.div>

          <motion.div
            className="mb-2 flex items-center justify-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            aria-hidden
          >
            <Sparkles className="h-4 w-4 text-amber-400/90" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-400/90">
              Interview complete
            </span>
            <Sparkles className="h-4 w-4 text-amber-400/90" />
          </motion.div>

          <motion.h1
            id="aura-interview-complete-title"
            className="font-bold text-3xl text-foreground tracking-tight"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            Thank you{firstName ? `, ${firstName}` : ""}!
          </motion.h1>

          <motion.p
            className="mt-3 text-base text-muted-foreground leading-relaxed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
          >
            You have completed both phases —{" "}
            <span className="text-amber-300/90">{phase1Title}</span> and{" "}
            <span className="text-sky-300/90">{phase2Title}</span>. Your responses for{" "}
            <span className="text-foreground font-medium">{companyName}</span> are saved securely.
            We truly appreciate your time and insights.
          </motion.p>

          <motion.div
            className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.42 }}
          >
            <p className="text-xs text-slate-400 leading-relaxed">
              AURA-METNMAT will use your interview to build accurate operational knowledge for your
              organization. You may close this screen or continue so the next colleague can begin.
            </p>
          </motion.div>

          <motion.div
            className="pt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48 }}
          >
            <button
              type="button"
              onClick={onContinue}
              disabled={loading}
              className="group flex h-12 w-full items-center justify-center rounded-xl bg-primary font-semibold text-base text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-amber-900/25 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={continueLabel}
            >
              <span>{loading ? "Saving your interview…" : continueLabel}</span>
              {!loading && (
                <Languages
                  className="ml-2 h-4 w-4 transition-transform group-hover:scale-110"
                  aria-hidden
                />
              )}
            </button>
          </motion.div>

          <motion.p
            className="pt-6 text-muted-foreground text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            Next step: choose a language and register the next employee
          </motion.p>
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.2em] text-amber-500/70">
          AURA-METNMAT
        </p>
      </motion.div>
    </div>
  );
}

export default InterviewCompleteWelcome;
