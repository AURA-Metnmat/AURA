"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square } from "lucide-react";
import { SPEECH_LANG_MAP } from "@/lib/aura/bilingual";
import type { PreferredLanguage } from "@/lib/aura/i18n";
import { cn } from "@/lib/utils";

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: { transcript: string };
}

interface SpeechRecognitionEvent {
  readonly results: Iterable<SpeechRecognitionResult>;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface VoiceInputButtonProps {
  language: PreferredLanguage;
  onTranscript: (text: string) => void;
  disabled?: boolean;
  labels: {
    speakAnswer: string;
    listening: string;
    stopListening: string;
    micUnsupported: string;
  };
}

export function VoiceInputButton({
  language,
  onTranscript,
  disabled,
  labels,
}: VoiceInputButtonProps) {
  const [listening, setListening] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setUnsupported(true);
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = SPEECH_LANG_MAP[language];

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (const result of event.results) {
        transcript += result[0]?.transcript ?? "";
      }
      if (transcript.trim()) {
        onTranscript(transcript.trim());
      }
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [language, onTranscript]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onMouseDown={start}
        onMouseUp={stop}
        onMouseLeave={listening ? stop : undefined}
        onTouchStart={(e) => {
          e.preventDefault();
          start();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          stop();
        }}
        className={cn(
          "shrink-0 w-12 h-12 flex items-center justify-center rounded-xl border transition-all",
          listening
            ? "bg-red-500/20 border-red-500 text-red-400 scale-105 shadow-lg shadow-red-500/20 animate-pulse"
            : "border-slate-600 hover:border-amber-500 hover:bg-amber-500/10 text-slate-300",
          disabled && "opacity-40 cursor-not-allowed"
        )}
        title={listening ? labels.stopListening : labels.speakAnswer}
      >
        {listening ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
      </button>
      <span className="text-[9px] text-slate-500 max-w-[4rem] text-center leading-tight">
        {listening ? labels.listening : labels.speakAnswer}
      </span>
      {unsupported && (
        <p className="text-[10px] text-amber-400/80 max-w-[140px] text-center">{labels.micUnsupported}</p>
      )}
    </div>
  );
}
