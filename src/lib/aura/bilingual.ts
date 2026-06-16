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
- "interaction": use for objective/multiple-choice questions whenever possible:
  {"type":"mcq","allowFreeText":true,"options":[{"id":"a","en":"Option in English","locale":"Option in ${name}"}, ...]}
  Provide exactly 3-4 concise, mutually exclusive options. IDs: short letters a,b,c,d.
  Use MCQ for: tenure, frequency, scale (team size), yes/no with nuance, severity, tool choice, process stage.
  Use open text only when the answer truly cannot be structured (e.g. describe a workflow).
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
- "interaction": use for objective questions:
  {"type":"mcq","allowFreeText":true,"options":[{"id":"a","en":"Option text","locale":"Option text"}, ...]}
  Provide exactly 3-4 concise options. Use MCQ for tenure, frequency, scale, severity, tool/process choices.
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
