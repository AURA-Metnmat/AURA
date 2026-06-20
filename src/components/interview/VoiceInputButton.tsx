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
  onUtteranceComplete?: (text: string) => void;
  disabled?: boolean;
  compact?: boolean;
  prominent?: boolean;
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
  onUtteranceComplete,
  disabled,
  compact,
  prominent,
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
  const onUtteranceCompleteRef = useRef(onUtteranceComplete);

  useEffect(() => {
    onTextChangeRef.current = onTextChange;
  }, [onTextChange]);

  useEffect(() => {
    onUtteranceCompleteRef.current = onUtteranceComplete;
  }, [onUtteranceComplete]);

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
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = LANGUAGE_TTS_PROFILE[language].speechLang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let gotFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTranscriptRef.current += chunk;
          gotFinal = true;
        } else {
          interim += chunk;
        }
      }

      const spoken = `${finalTranscriptRef.current}${interim}`.trim();
      const prefix = baseTextRef.current;
      onTextChangeRef.current(prefix ? `${prefix} ${spoken}`.trim() : spoken);

      if (gotFinal) {
        listeningIntentRef.current = false;
        recognition.stop();
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone permission denied. Allow mic access in browser settings.");
        listeningIntentRef.current = false;
        setListening(false);
        return;
      }
      if (event.error === "aborted") return;
      if (event.error === "no-speech") {
        setError("No speech detected. Tap mic to try again.");
        listeningIntentRef.current = false;
        setListening(false);
        return;
      }
      setError("Voice capture interrupted. Tap mic to try again.");
      listeningIntentRef.current = false;
      setListening(false);
    };

    recognition.onend = () => {
      applyTranscript();
      const spoken = finalTranscriptRef.current.trim();
      const prefix = baseTextRef.current;
      const full = prefix ? `${prefix} ${spoken}`.trim() : spoken;
      if (full) {
        onUtteranceCompleteRef.current?.(full);
      }
      listeningIntentRef.current = false;
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

  useEffect(() => {
    if (disabled && listening) {
      stop();
    }
  }, [disabled, listening, stop]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (listening) {
      stop();
    } else {
      void start();
    }
  }, [disabled, listening, start, stop]);

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
    <div className={cn("flex flex-col items-center gap-1", compact && !prominent && "gap-0")}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "shrink-0 flex items-center justify-center rounded-xl border transition-all relative",
          prominent ? "w-14 h-14" : compact ? "w-8 h-8" : "w-12 h-12",
          listening
            ? "bg-red-500/20 border-red-500 text-red-400 shadow-lg shadow-red-500/20"
            : prominent
              ? "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:border-amber-400"
              : "border-slate-600 hover:border-amber-500 hover:bg-amber-500/10 text-slate-300",
          disabled && "opacity-40 cursor-not-allowed"
        )}
        title={listening ? labels.stopListening : labels.speakAnswer}
        aria-pressed={listening}
      >
        {listening && prominent && (
          <span className="absolute inset-0 rounded-xl border-2 border-red-400/50 animate-ping" />
        )}
        {listening ? (
          <Square className={cn("fill-current relative z-10", prominent ? "w-6 h-6" : compact ? "w-3.5 h-3.5" : "w-5 h-5")} />
        ) : (
          <Mic className={cn("relative z-10", prominent ? "w-6 h-6" : compact ? "w-3.5 h-3.5" : "w-5 h-5")} />
        )}
      </button>
      {(prominent || !compact) && (
        <span className={cn("text-slate-500 text-center leading-tight", prominent ? "text-xs max-w-[8rem]" : "text-[9px] max-w-[4.5rem]")}>
          {listening ? labels.listening : labels.speakAnswer}
        </span>
      )}
      {(prominent || !compact) && unsupported && (
        <p className="text-[10px] text-amber-400/80 max-w-[180px] text-center">{labels.micUnsupported}</p>
      )}
      {(prominent || !compact) && error && (
        <p className="text-[10px] text-red-300/90 max-w-[200px] text-center flex items-start gap-1 justify-center">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
