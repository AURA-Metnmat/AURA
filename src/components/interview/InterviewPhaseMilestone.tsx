"use client";

import { ClipboardList, PartyPopper } from "lucide-react";
import { motion } from "framer-motion";
import { InterviewCompleteWelcome } from "@/components/ui/welcome";

interface InterviewPhaseMilestoneProps {
  variant: "phase1_complete" | "phase2_thankyou";
  phase1Title: string;
  phase2Title: string;
  participantName?: string;
  companyName: string;
  onContinue?: () => void;
  onFinish?: () => void;
  loading?: boolean;
}

export function InterviewPhaseMilestone({
  variant,
  phase1Title,
  phase2Title,
  participantName,
  companyName,
  onContinue,
  onFinish,
  loading,
}: InterviewPhaseMilestoneProps) {
  if (variant === "phase2_thankyou") {
    return (
      <InterviewCompleteWelcome
        companyName={companyName}
        participantName={participantName}
        phase1Title={phase1Title}
        phase2Title={phase2Title}
        onContinue={() => onFinish?.()}
        loading={loading}
      />
    );
  }

  const firstName = participantName?.trim().split(/\s+/)[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-8 shadow-2xl shadow-amber-900/20 text-center"
        role="dialog"
        aria-labelledby="phase1-complete-title"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/40"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.1 }}
        >
          <PartyPopper className="h-8 w-8 text-amber-400" aria-hidden />
        </motion.div>
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400/90 mb-2">Phase 1 complete</p>
        <h2 id="phase1-complete-title" className="text-2xl font-semibold text-white mb-2">
          Congratulations{firstName ? `, ${firstName}` : ""}!
        </h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-6">
          You have successfully completed <strong className="text-amber-200">{phase1Title}</strong>.
          Thank you for sharing your experience with us.
        </p>
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 mb-6 text-left">
          <div className="flex items-start gap-3">
            <ClipboardList className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-medium text-slate-200">Up next: {phase2Title}</p>
              <p className="text-xs text-slate-400 mt-1">
                A short structured assessment with predefined questions. Select your answers where
                options are shown.
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onContinue}
          disabled={loading}
          className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold py-3 px-6 transition-colors"
        >
          {loading ? "Starting…" : `Start ${phase2Title}`}
        </button>
      </motion.div>
    </div>
  );
}
