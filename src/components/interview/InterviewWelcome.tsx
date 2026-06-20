"use client";

import { cn } from "@/lib/utils";
import type { Language } from "@/lib/aura/i18n";

interface LanguageOption {
  id: Language;
  label: string;
  native: string;
}

interface InterviewWelcomeProps {
  companyName: string;
  welcome: string;
  welcomeDesc: string;
  selectLanguage: string;
  languages: LanguageOption[];
  onSelectLanguage: (language: Language) => void;
}

export function InterviewWelcome({
  companyName,
  welcome,
  welcomeDesc,
  selectLanguage,
  languages,
  onSelectLanguage,
}: InterviewWelcomeProps) {
  return (
    <main className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-amber-400/80">{companyName}</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-100">{welcome}</h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">{welcomeDesc}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 space-y-4">
          <p className="text-sm text-slate-400 text-center">{selectLanguage}</p>
          <div className="grid grid-cols-2 gap-3">
            {languages.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => onSelectLanguage(lang.id)}
                className={cn(
                  "p-4 rounded-xl border border-white/10 bg-slate-900/50",
                  "hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors text-left"
                )}
              >
                <p className="font-semibold text-base text-slate-100">{lang.native}</p>
                <p className="text-xs text-slate-500 mt-0.5">{lang.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
