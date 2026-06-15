"use client";

import { useState, useRef, useCallback } from "react";
import { Volume2, Loader2, Square } from "lucide-react";
import type { Language } from "@/lib/aura/i18n";
import { cn } from "@/lib/utils";

interface AudioPlayButtonProps {
  text: string;
  language: Language;
  className?: string;
  label?: string;
}

export function AudioPlayButton({ text, language, className, label = "Listen" }: AudioPlayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
  }, []);

  const play = useCallback(async () => {
    if (!text.trim() || loading) return;
    if (playing) {
      stop();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/interview/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
      });
      if (!res.ok) throw new Error("TTS failed");

      const blob = await res.blob();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onerror = () => setPlaying(false);
      await audio.play();
      setPlaying(true);
    } catch {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setPlaying(false);
        window.speechSynthesis.speak(utterance);
        setPlaying(true);
      }
    } finally {
      setLoading(false);
    }
  }, [text, language, loading, playing, stop]);

  return (
    <button
      type="button"
      onClick={play}
      disabled={loading || !text.trim()}
      title={label}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md",
        "border border-white/10 hover:border-amber-500/40 hover:bg-amber-500/10 transition-colors",
        "disabled:opacity-40",
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
      <span>{playing ? "Stop" : label}</span>
    </button>
  );
}
