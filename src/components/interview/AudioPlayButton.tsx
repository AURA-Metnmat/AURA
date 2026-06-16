"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Volume2, Loader2, Square, AlertCircle } from "lucide-react";
import type { Language } from "@/lib/aura/i18n";
import { claimAudioPlayback, releaseAudioPlayback } from "@/lib/aura/audio-playback-manager";
import { speakWithBrowser, waitForBrowserVoices } from "@/lib/aura/browser-tts";
import { cn } from "@/lib/utils";

interface AudioPlayButtonProps {
  text: string;
  language: Language;
  className?: string;
  label?: string;
  autoPlay?: boolean;
}

export function AudioPlayButton({
  text,
  language,
  className,
  label = "Audio",
  autoPlay = false,
}: AudioPlayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setPlaying(false);
    setLoading(false);
    releaseAudioPlayback(stop);
  }, []);

  useEffect(() => {
    void waitForBrowserVoices();
    return () => stop();
  }, [stop]);

  const startBrowserPlayback = useCallback(() => {
    const started = speakWithBrowser(
      text,
      language,
      () => {
        setPlaying(false);
        releaseAudioPlayback(stop);
      },
      () => {
        setPlaying(false);
        setError("Could not play audio. Tap again.");
        releaseAudioPlayback(stop);
      }
    );

    if (!started) return false;
    setPlaying(true);
    setError(null);
    return true;
  }, [language, stop, text]);

  const startOpenAiPlayback = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const res = await fetch("/api/interview/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error("TTS request failed");
    }

    const blob = await res.blob();
    if (!blob.size) {
      throw new Error("Empty audio response");
    }

    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
    }
    const url = URL.createObjectURL(blob);
    urlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => {
      setPlaying(false);
      releaseAudioPlayback(stop);
    };
    audio.onerror = () => {
      setPlaying(false);
      startBrowserPlayback();
    };

    await audio.play();
    setPlaying(true);
    setError(null);
  }, [language, startBrowserPlayback, stop, text]);

  const togglePlayback = useCallback(async () => {
    if (!text.trim()) return;

    if (playing || loading) {
      stop();
      return;
    }

    claimAudioPlayback(stop);
    setLoading(true);
    setError(null);

    try {
      await startOpenAiPlayback();
    } catch {
      const browserOk = startBrowserPlayback();
      if (!browserOk) {
        setError("Could not play audio. Check connection and try again.");
        releaseAudioPlayback(stop);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, playing, startBrowserPlayback, startOpenAiPlayback, stop, text]);

  const autoPlayedRef = useRef(false);

  useEffect(() => {
    autoPlayedRef.current = false;
  }, [text, language]);

  useEffect(() => {
    if (!autoPlay || !text.trim() || autoPlayedRef.current) return;
    autoPlayedRef.current = true;
    const timer = window.setTimeout(() => {
      void togglePlayback();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [autoPlay, text, language, togglePlayback]);

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={() => void togglePlayback()}
        disabled={!text.trim()}
        title={error ?? (playing ? "Stop audio" : label)}
        aria-pressed={playing}
        aria-label={playing ? "Stop audio" : label}
        className={cn(
          "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md",
          "border transition-colors",
          playing
            ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
            : "border-white/10 hover:border-amber-500/40 hover:bg-amber-500/10",
          loading && "opacity-70",
          !text.trim() && "opacity-40 cursor-not-allowed",
          className
        )}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : playing ? (
          <Square className="w-3 h-3" />
        ) : (
          <Volume2 className="w-3 h-3" />
        )}
        <span>{loading ? "Loading" : playing ? "Stop" : label}</span>
      </button>
      {error && (
        <span className="text-[9px] text-red-300/90 flex items-center gap-0.5 max-w-[120px] text-right leading-tight">
          <AlertCircle className="w-2.5 h-2.5 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}
