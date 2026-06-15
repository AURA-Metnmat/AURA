"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square } from "lucide-react";
import { SPEECH_LANG_MAP } from "@/lib/aura/bilingual";
import type { Language } from "@/lib/aura/i18n";
import { cn } from "@/lib/utils";

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
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
  language: Language;
  baseText: string;
  onTextChange: (text: string) => void;
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
  baseText,
  onTextChange,
  disabled,
  labels,
}: VoiceInputButtonProps) {
  const [listening, setListening] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseTextRef = useRef("");
  const finalTranscriptRef = useRef("");

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

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    baseTextRef.current = baseText.trim();
    finalTranscriptRef.current = "";

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = SPEECH_LANG_MAP[language];

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTranscriptRef.current += chunk;
        } else {
          interim += chunk;
        }
      }

      const spoken = `${finalTranscriptRef.current}${interim}`.trim();
      const prefix = baseTextRef.current;
      onTextChange(prefix ? `${prefix} ${spoken}`.trim() : spoken);
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setListening(false);
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setUnsupported(false);
    } catch {
      setUnsupported(true);
      setListening(false);
    }
  }, [baseText, language, onTextChange]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
    } else {
      start();
    }
  }, [listening, start, stop]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "shrink-0 w-12 h-12 flex items-center justify-center rounded-xl border transition-all",
          listening
            ? "bg-red-500/20 border-red-500 text-red-400 scale-105 shadow-lg shadow-red-500/20 animate-pulse"
            : "border-slate-600 hover:border-amber-500 hover:bg-amber-500/10 text-slate-300",
          disabled && "opacity-40 cursor-not-allowed"
        )}
        title={listening ? labels.stopListening : labels.speakAnswer}
        aria-pressed={listening}
      >
        {listening ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
      </button>
      <span className="text-[9px] text-slate-500 max-w-[4.5rem] text-center leading-tight">
        {listening ? labels.listening : labels.speakAnswer}
      </span>
      {unsupported && (
        <p className="text-[10px] text-amber-400/80 max-w-[140px] text-center">{labels.micUnsupported}</p>
      )}
    </div>
  );
}
