"use client";

import { ShieldCheck } from "lucide-react";
import { CONSENT_POINTS } from "@/lib/interview/consent";

interface ConsentScreenProps {
  companyName: string;
  loading?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentScreen({ companyName, loading, onAccept, onDecline }: ConsentScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
      <div className="max-w-xl w-full rounded-2xl border border-white/10 bg-slate-950/70 p-8">
        <div className="flex items-center gap-3 mb-5">
          <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-white">Consent & data use</h2>
            <p className="text-sm text-slate-500 mt-0.5">{companyName}</p>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-4 leading-relaxed">
          Before we begin, please confirm you understand how your interview data will be collected and
          used.
        </p>

        <ul className="space-y-3 mb-6">
          {CONSENT_POINTS.map((point) => (
            <li key={point} className="flex gap-3 text-sm text-slate-300 leading-relaxed">
              <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-slate-500 mb-6">
          By continuing, you consent to this interview being recorded as text (and any files you upload).
          You may request correction of your data through your company administrator.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onAccept}
            disabled={loading}
            className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            {loading ? "Starting…" : "I agree — start interview"}
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={loading}
            className="flex-1 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 py-3 px-4 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
