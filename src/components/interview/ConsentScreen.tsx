"use client";

import { ShieldCheck } from "lucide-react";
import { getConsentCopy } from "@/lib/interview/consent";
import type { Language } from "@/lib/aura/i18n";

interface ConsentScreenProps {
  companyName: string;
  language: Language;
  loading?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentScreen({
  companyName,
  language,
  loading,
  onAccept,
  onDecline,
}: ConsentScreenProps) {
  const copy = getConsentCopy(language);

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
      <div className="max-w-xl w-full rounded-2xl border border-white/10 bg-slate-950/70 p-8">
        <div className="flex items-center gap-3 mb-5">
          <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-white">{copy.title}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{companyName}</p>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-4 leading-relaxed">{copy.intro}</p>

        <ul className="space-y-3 mb-6">
          {copy.points.map((point) => (
            <li key={point} className="flex gap-3 text-sm text-slate-300 leading-relaxed">
              <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-slate-500 mb-6">{copy.footer}</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onAccept}
            disabled={loading}
            className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            {loading ? "Starting…" : copy.accept}
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={loading}
            className="flex-1 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 py-3 px-4 rounded-xl transition-colors"
          >
            {copy.decline}
          </button>
        </div>
      </div>
    </div>
  );
}
