"use client";

import { Languages, Sparkles } from "lucide-react";
import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/aura/i18n";

const SPLINE_SCENE = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

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
    <main className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
      <Card className="w-full max-w-6xl min-h-[520px] md:min-h-[560px] bg-black/[0.96] border-white/10 relative overflow-hidden shadow-2xl shadow-black/40">
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

        <div className="flex flex-col md:flex-row h-full min-h-[520px] md:min-h-[560px]">
          {/* Left — welcome + language */}
          <div className="flex-1 p-6 sm:p-8 md:p-10 relative z-10 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xs uppercase tracking-[0.25em] text-amber-400/90">{companyName}</p>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 leading-tight">
              {welcome}
            </h1>
            <p className="mt-4 text-sm sm:text-base text-neutral-300 max-w-lg leading-relaxed">
              {welcomeDesc}
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Languages className="w-4 h-4 text-amber-400/80" />
                <p className="text-sm text-neutral-400">{selectLanguage}</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => onSelectLanguage(lang.id)}
                    className={cn(
                      "group p-3.5 sm:p-4 rounded-xl border border-white/10 bg-black/30",
                      "hover:border-amber-500/50 hover:bg-amber-500/10 transition-all duration-200 text-left",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                    )}
                  >
                    <p className="font-semibold text-base text-neutral-100 group-hover:text-amber-200 transition-colors">
                      {lang.native}
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{lang.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right — 3D scene */}
          <div className="flex-1 relative min-h-[220px] sm:min-h-[280px] md:min-h-0 border-t md:border-t-0 md:border-l border-white/10">
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-black/20 pointer-events-none z-[2]" />
            <SplineScene scene={SPLINE_SCENE} className="w-full h-full min-h-[220px] sm:min-h-[280px] md:min-h-full" />
          </div>
        </div>
      </Card>
    </main>
  );
}
