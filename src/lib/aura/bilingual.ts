import type { Language } from "./i18n";

export interface BilingualText {
  en: string;
  locale: string;
}

const LOCALE_NAMES: Record<Language, string> = {
  en: "English",
  hi: "Hindi (हिन्दी)",
  or: "Odia (ଓଡ଼ିଆ)",
  bn: "Bengali (বাংলা)",
};

export function localeDisplayName(lang: Language): string {
  return LOCALE_NAMES[lang];
}

/** Regional languages that use bilingual EN + locale AI responses */
export type RegionalLanguage = Exclude<Language, "en">;

export function parseBilingualJson(raw: string, fallbackLocale: string): BilingualText {
  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed) as { en?: string; locale?: string };
      if (parsed.en && parsed.locale) {
        return { en: parsed.en.trim(), locale: parsed.locale.trim() };
      }
    }
  } catch {
    // fall through
  }
  return { en: raw.trim(), locale: fallbackLocale || raw.trim() };
}

export function bilingualInstruction(lang: RegionalLanguage): string {
  const name = LOCALE_NAMES[lang];
  return `IMPORTANT: Respond ONLY with valid JSON (no markdown fences):
{"en":"...","locale":"..."}
- "en": professional English — warm acknowledgment + ONE follow-up question.
- "locale": same meaning in ${name}.
- Never ask multiple questions at once.
- Sound like a friendly senior colleague, not a form. Acknowledge what they shared before the next question.
- If they mention problems, confusion, or blockers, empathize first and offer to clarify or break the question into smaller parts.
- Use familiar, conversational phrasing. Invite specifics: names, numbers, steps, tools, and real examples from daily work.
- The employee may reply in ${name}; understand their intent.`;
}

/** True when AI should return bilingual JSON (EN + regional locale) */
export function isPreferredLanguage(lang: Language): lang is RegionalLanguage {
  return lang === "hi" || lang === "or" || lang === "bn";
}

export const TTS_VOICE = "nova";

export const SPEECH_LANG_MAP: Record<Language, string> = {
  en: "en-US",
  hi: "hi-IN",
  or: "or-IN",
  bn: "bn-IN",
};
