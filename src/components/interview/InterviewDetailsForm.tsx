"use client";

import {
  User,
  Briefcase,
  Building2,
  Phone,
  Mail,
  Shield,
  ArrowLeft,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { Language, UiStrings } from "@/lib/aura/i18n";
import type { EngagementStrings } from "@/lib/aura/engagement";
import { cn } from "@/lib/utils";

interface ParticipantForm {
  fullName: string;
  designation: string;
  department: string;
  mobile: string;
  email: string;
}

interface InterviewDetailsFormProps {
  companyName: string;
  language: Language;
  form: ParticipantForm;
  formErrors: Partial<Record<keyof ParticipantForm, string>>;
  loading: boolean;
  error: string | null;
  t: UiStrings;
  engagement: EngagementStrings;
  onChange: (form: ParticipantForm) => void;
  onBack: () => void;
  onSubmit: () => void;
}

const FIELDS = [
  { key: "fullName" as const, icon: User, required: true, type: "text" },
  { key: "designation" as const, icon: Briefcase, required: true, type: "text" },
  { key: "department" as const, icon: Building2, required: true, type: "text" },
  { key: "mobile" as const, icon: Phone, required: true, type: "tel" },
  { key: "email" as const, icon: Mail, required: false, type: "email" },
] as const;

const LABELS: Record<keyof ParticipantForm, keyof UiStrings> = {
  fullName: "fullName",
  designation: "designation",
  department: "department",
  mobile: "mobile",
  email: "emailOptional",
};

export function InterviewDetailsForm({
  companyName,
  form,
  formErrors,
  loading,
  error,
  t,
  engagement,
  onChange,
  onBack,
  onSubmit,
}: InterviewDetailsFormProps) {
  return (
    <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
          <span className="text-emerald-400">● Language</span>
          <span>—</span>
          <span className="text-amber-400">● Details</span>
          <span>—</span>
          <span className="text-slate-600">○ Chat</span>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-widest text-amber-400/90">{companyName}</p>
          <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
            {t.yourDetails}
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">{engagement.detailsDesc}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">{engagement.stepLabel}</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="relative rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

          <div className="p-6 sm:p-8 space-y-4">
            {FIELDS.map(({ key, icon: Icon, required, type }) => (
              <div key={key}>
                <label className="flex items-center gap-2 text-sm text-slate-300 mb-1.5">
                  <Icon className="w-3.5 h-3.5 text-amber-500/80" />
                  {t[LABELS[key]]}
                  {required && <span className="text-amber-500 text-xs">*</span>}
                </label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => onChange({ ...form, [key]: e.target.value })}
                  className={cn(
                    "w-full bg-slate-950/80 border rounded-xl px-4 py-3 text-sm transition-colors",
                    "focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20",
                    formErrors[key] ? "border-red-500/50" : "border-white/10"
                  )}
                />
                {formErrors[key] && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">{formErrors[key]}</p>
                )}
              </div>
            ))}

            <div className="flex items-start gap-2 rounded-xl bg-slate-950/50 border border-white/5 px-3 py-2.5">
              <Shield className="w-4 h-4 text-emerald-500/80 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-500 leading-relaxed">{engagement.secureNote}</p>
            </div>

            {error && (
              <p className="text-sm text-red-300 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center justify-center gap-1 px-4 border border-white/10 rounded-xl py-3 text-sm hover:bg-slate-800/60 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 font-semibold rounded-xl py-3.5 text-sm shadow-lg shadow-amber-500/25 transition-all"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {loading ? "..." : t.startInterview}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
