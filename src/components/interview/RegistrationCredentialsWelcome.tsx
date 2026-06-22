"use client";

import { AlertTriangle, ArrowRight, Mail, Phone } from "lucide-react";

interface RegistrationCredentialsWelcomeProps {
  companyName: string;
  employeeName: string;
  mobile: string;
  email: string;
  password: string;
  emailSent: boolean;
  onContinue: () => void;
}

export function RegistrationCredentialsWelcome({
  companyName,
  employeeName,
  mobile,
  email,
  password,
  emailSent,
  onContinue,
}: RegistrationCredentialsWelcomeProps) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 overflow-y-auto">
      <div className="w-full max-w-lg my-auto">
        <div className="rounded-2xl border border-amber-500/30 bg-slate-900/95 shadow-2xl shadow-black/40 overflow-hidden">
          <div className="bg-amber-500/15 border-b border-amber-500/25 px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-amber-400/90 font-semibold">
                Important — save your credentials
              </p>
              <h2 className="text-xl font-bold text-white mt-1">
                Welcome, {employeeName}!
              </h2>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                Your profile at {companyName} is ready. Please remember these details to sign in
                again later.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4 space-y-3">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Username</p>
              <div className="flex items-center gap-2 text-slate-100">
                <Phone className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-mono text-sm break-all">{mobile}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-100">
                <Mail className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-mono text-sm break-all">{email}</span>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Sign in with either your mobile number or email.
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-2">
                Password
              </p>
              <p className="font-mono text-lg text-white tracking-wide">{password}</p>
            </div>

            {emailSent ? (
              <p className="text-sm text-emerald-400/90 bg-emerald-950/40 border border-emerald-800/40 rounded-xl px-4 py-3 text-center">
                A copy of these credentials has been sent to <strong>{email}</strong>.
              </p>
            ) : (
              <p className="text-sm text-amber-200/80 bg-amber-950/30 border border-amber-800/30 rounded-xl px-4 py-3 text-center">
                Please write down these credentials now. Email delivery is not available for this
                address yet.
              </p>
            )}

            <button
              type="button"
              onClick={onContinue}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-red-900 to-red-700 border border-red-700/50 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:from-red-800 hover:to-red-600 transition-all"
            >
              I&apos;ve saved my credentials — Start interview
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
