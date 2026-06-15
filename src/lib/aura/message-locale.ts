import type { Language } from "./i18n";
import { OPENING_Q2_EN, getOpeningQuestion1, getOpeningQuestion2 } from "./opening-questions";

/** Resolve the preferred-language column text for display (handles language switches). */
export function resolveMessageLocale(
  contentEn: string,
  contentLocale: string,
  preferredLanguage: Language,
  participantName?: string
): string {
  if (preferredLanguage === "en") {
    return contentEn;
  }

  if (contentLocale.trim() && contentLocale.trim() !== contentEn.trim()) {
    return contentLocale;
  }

  const localized = localizeOpeningFromEnglish(contentEn, preferredLanguage, participantName);
  if (localized) {
    return localized;
  }

  return contentLocale || contentEn;
}

export function localizeOpeningFromEnglish(
  contentEn: string,
  lang: Language,
  participantName?: string
): string | null {
  if (lang === "en") return contentEn;

  const trimmed = contentEn.trim();

  if (trimmed === OPENING_Q2_EN) {
    return getOpeningQuestion2(lang, "").locale;
  }

  const welcomeMatch = trimmed.match(/^Welcome,\s*(.+?)\.\s*Thank you/i);
  if (welcomeMatch) {
    const name = participantName?.trim() || welcomeMatch[1]?.trim() || "there";
    return getOpeningQuestion1(lang, name).locale;
  }

  const thankYouMatch = trimmed.match(/^Thank you,\s*(.+?)\./i);
  if (thankYouMatch) {
    const name = participantName?.trim() || thankYouMatch[1]?.trim() || "there";
    return getOpeningQuestion1(lang, name).locale;
  }

  return null;
}
