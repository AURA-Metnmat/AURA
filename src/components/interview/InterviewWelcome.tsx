"use client";

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
    <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
      <Card className="w-full max-w-6xl min-h-[520px] md:min-h-[560px] bg-black/[0.96] border-border/60 relative overflow-hidden shadow-2xl">
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

        <div className="flex flex-col md:flex-row h-full min-h-[520px] md:min-h-[560px]">
          <div className="flex-1 p-6 sm:p-8 md:p-10 relative z-10 flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3">{companyName}</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
              {welcome}
            </h1>
            <p className="mt-4 text-sm sm:text-base text-neutral-300 max-w-lg leading-relaxed">
              {welcomeDesc}
            </p>

            <div className="mt-8">
              <p className="text-sm text-muted-foreground mb-4">{selectLanguage}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => onSelectLanguage(lang.id)}
                    className={cn(
                      "group p-4 rounded-xl border border-border/80 bg-background/40 backdrop-blur-sm",
                      "hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 text-left"
                    )}
                  >
                    <p className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                      {lang.native}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{lang.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 relative min-h-[240px] md:min-h-0 border-t md:border-t-0 md:border-l border-border/40">
            <SplineScene scene={SPLINE_SCENE} className="w-full h-full min-h-[240px] md:min-h-full" />
          </div>
        </div>
      </Card>
    </main>
  );
}
