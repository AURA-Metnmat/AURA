import type { Language } from "./i18n";

export type TtsVoice =
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "fable"
  | "nova"
  | "onyx"
  | "sage"
  | "shimmer";

export interface LanguageTtsProfile {
  voice: TtsVoice;
  speed: number;
  instructions: string;
  /** BCP-47 tag for browser speech fallback */
  speechLang: string;
}

export const LANGUAGE_TTS_PROFILE: Record<Language, LanguageTtsProfile> = {
  en: {
    voice: "nova",
    speed: 0.95,
    instructions:
      "Speak in clear, professional English. Moderate pace, warm and friendly tone. Pronounce every word distinctly.",
    speechLang: "en-US",
  },
  hi: {
    voice: "shimmer",
    speed: 0.92,
    instructions:
      "Speak in clear Hindi. Natural Indian Hindi pronunciation. Moderate pace, warm professional tone.",
    speechLang: "hi-IN",
  },
  bn: {
    voice: "coral",
    speed: 0.92,
    instructions:
      "Speak in clear Bengali. Natural West Bengal Bengali pronunciation. Moderate pace, warm professional tone.",
    speechLang: "bn-IN",
  },
  or: {
    voice: "shimmer",
    speed: 0.92,
    instructions:
      "Speak in clear Odia. Natural Odia pronunciation. Moderate pace, warm professional tone.",
    speechLang: "or-IN",
  },
};

/** Strip markdown/noise so TTS reads naturally. */
export function sanitizeTextForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const TTS_MODEL_PRIMARY = "gpt-4o-mini-tts";
export const TTS_MODEL_FALLBACK = "tts-1-hd";
export const TTS_MAX_CHARS = 4096;
