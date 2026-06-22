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
{"en":"...","locale":"...","interaction":{...}}
- "en": professional English — warm acknowledgment + ONE clear question (no options listed in prose when using MCQ).
- "locale": same meaning in ${name}, written fully in native script (not romanized).
- "interaction": use structured widgets whenever possible (pick ONE type per question):
  MCQ: {"type":"mcq","allowFreeText":true,"options":[{"id":"a","en":"...","locale":"..."}, ...]} — 3-4 options, ids a,b,c,d.
  Yes/No: {"type":"yes_no","allowFreeText":true}
  Rating (1-5 scale): {"type":"rating","min":1,"max":5,"minLabel":"Low","maxLabel":"High","allowFreeText":true}
  Numeric: {"type":"numeric","unit":"people","placeholder":"e.g. 12","allowFreeText":true}
  Use MCQ for tenure, tool choice, process stage. Use yes_no for binary decisions. Use rating for severity/frequency. Use numeric for counts/durations.
  Do not list MCQ options in prose when interaction is present.
- Keep en/locale to 2-3 short sentences. Sound like a friendly senior colleague.
- Never ask multiple unrelated questions at once.
- Acknowledge what they shared before the next question.
- If they mention problems, empathize first and offer to clarify.
- Invite specifics when follow-up is open-ended.`;
}

export function englishInstruction(): string {
  return `IMPORTANT: Respond ONLY with valid JSON (no markdown fences):
{"en":"...","interaction":{...}}
- "en": warm acknowledgment + ONE clear question. Do not list MCQ options in the prose when interaction is present.
- "interaction": use structured widgets (one per question):
  MCQ: {"type":"mcq","allowFreeText":true,"options":[{"id":"a","en":"...","locale":"..."}, ...]}
  Yes/No: {"type":"yes_no","allowFreeText":true}
  Rating: {"type":"rating","min":1,"max":5,"allowFreeText":true}
  Numeric: {"type":"numeric","unit":"hours","allowFreeText":true}
  Prefer structured types for tenure, frequency, severity, team size, tool choice. Open text only when truly narrative.
- Keep to 2-3 short sentences natural for voice/TTS.
- One question at a time. Friendly senior colleague tone.`;
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

export { LANGUAGE_TTS_PROFILE } from "./tts-config";
