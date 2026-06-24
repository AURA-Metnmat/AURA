"use client";

import { CheckCircle2, ClipboardList, PartyPopper, Sparkles } from "lucide-react";

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
  if (variant === "phase1_complete") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div
          className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-8 shadow-2xl shadow-amber-900/20 text-center"
          role="dialog"
          aria-labelledby="phase1-complete-title"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/40">
            <PartyPopper className="h-8 w-8 text-amber-400" aria-hidden />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-amber-400/90 mb-2">Phase 1 complete</p>
          <h2 id="phase1-complete-title" className="text-2xl font-semibold text-white mb-2">
            Congratulations{participantName ? `, ${participantName.split(" ")[0]}` : ""}!
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
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-8 shadow-2xl shadow-emerald-900/20 text-center"
        role="dialog"
        aria-labelledby="interview-thankyou-title"
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/40">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" aria-hidden />
        </div>
        <div className="flex justify-center gap-1 mb-3" aria-hidden>
          <Sparkles className="h-4 w-4 text-emerald-400/80" />
          <Sparkles className="h-4 w-4 text-emerald-300" />
          <Sparkles className="h-4 w-4 text-emerald-400/80" />
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/90 mb-2">Interview complete</p>
        <h2 id="interview-thankyou-title" className="text-2xl font-semibold text-white mb-2">
          Thank you!
        </h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-6">
          Thank you for completing the interview and helping us understand your work at{" "}
          <strong className="text-emerald-200">{companyName}</strong>. Your responses have been
          saved securely — we truly appreciate your time.
        </p>
        <button
          type="button"
          onClick={onFinish}
          disabled={loading}
          className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-semibold py-3 px-6 transition-colors"
        >
          {loading ? "Saving…" : "Done"}
        </button>
      </div>
    </div>
  );
}
