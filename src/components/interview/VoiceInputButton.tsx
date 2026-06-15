"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, AlertCircle } from "lucide-react";
import { LANGUAGE_TTS_PROFILE } from "@/lib/aura/tts-config";
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
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseTextRef = useRef("");
  const finalTranscriptRef = useRef("");
  const listeningIntentRef = useRef(false);
  const onTextChangeRef = useRef(onTextChange);

  useEffect(() => {
    onTextChangeRef.current = onTextChange;
  }, [onTextChange]);

  const applyTranscript = useCallback(() => {
    const spoken = finalTranscriptRef.current.trim();
    const prefix = baseTextRef.current;
    onTextChangeRef.current(prefix ? `${prefix} ${spoken}`.trim() : spoken);
  }, []);

  const stop = useCallback(() => {
    listeningIntentRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startRecognition = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setUnsupported(true);
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANGUAGE_TTS_PROFILE[language].speechLang;

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
      onTextChangeRef.current(prefix ? `${prefix} ${spoken}`.trim() : spoken);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone permission denied. Allow mic access in browser settings.");
        listeningIntentRef.current = false;
        setListening(false);
        return;
      }
      if (event.error === "aborted") return;
      if (event.error === "no-speech") return;
      setError("Voice capture interrupted. Tap mic to try again.");
      listeningIntentRef.current = false;
      setListening(false);
    };

    recognition.onend = () => {
      if (listeningIntentRef.current) {
        try {
          recognition.start();
        } catch {
          applyTranscript();
          listeningIntentRef.current = false;
          setListening(false);
        }
        return;
      }
      applyTranscript();
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setUnsupported(false);
      setError(null);
    } catch {
      setUnsupported(true);
      listeningIntentRef.current = false;
      setListening(false);
    }
  }, [applyTranscript, language]);

  const start = useCallback(async () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setUnsupported(true);
      return;
    }

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        setError("Microphone permission denied. Allow mic access in browser settings.");
        return;
      }
    }

    baseTextRef.current = baseText.trim();
    finalTranscriptRef.current = "";
    listeningIntentRef.current = true;
    startRecognition();
  }, [baseText, startRecognition]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
    } else {
      void start();
    }
  }, [listening, start, stop]);

  useEffect(() => () => {
    listeningIntentRef.current = false;
    recognitionRef.current?.abort();
  }, []);

  useEffect(() => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.lang = LANGUAGE_TTS_PROFILE[language].speechLang;
    }
  }, [language, listening]);

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
      {error && (
        <p className="text-[10px] text-red-300/90 max-w-[160px] text-center flex items-start gap-1">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
