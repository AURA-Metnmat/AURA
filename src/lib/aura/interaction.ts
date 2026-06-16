import type { Language } from "./i18n";

export interface McqOption {
  id: string;
  en: string;
  locale: string;
}

export interface McqInteraction {
  type: "mcq";
  options: McqOption[];
  allowFreeText?: boolean;
}

export type MessageInteraction = McqInteraction;

export function serializeInteraction(meta: MessageInteraction): string {
  return JSON.stringify(meta);
}

export function parseInteraction(raw: string | null | undefined): MessageInteraction | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as MessageInteraction;
    if (parsed?.type === "mcq" && Array.isArray(parsed.options) && parsed.options.length >= 2) {
      return {
        type: "mcq",
        allowFreeText: parsed.allowFreeText ?? true,
        options: parsed.options
          .filter((o) => o?.id && o?.en)
          .map((o) => ({
            id: String(o.id),
            en: String(o.en).trim(),
            locale: String(o.locale ?? o.en).trim(),
          })),
      };
    }
  } catch {
    // ignore invalid metadata
  }
  return null;
}

export function parseAssistantPayload(
  raw: string,
  fallbackLocale: string
): {
  en: string;
  locale: string;
  interaction: MessageInteraction | null;
} {
  try {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{")) {
      return { en: trimmed, locale: fallbackLocale || trimmed, interaction: null };
    }
    const parsed = JSON.parse(trimmed) as {
      en?: string;
      locale?: string;
      interaction?: MessageInteraction;
    };
    const en = parsed.en?.trim() ?? trimmed;
    const locale = parsed.locale?.trim() ?? fallbackLocale ?? en;
    let interaction: MessageInteraction | null = null;
    if (parsed.interaction?.type === "mcq" && Array.isArray(parsed.interaction.options)) {
      interaction = {
        type: "mcq",
        allowFreeText: parsed.interaction.allowFreeText ?? true,
        options: parsed.interaction.options
          .filter((o) => o?.id && o?.en)
          .map((o) => ({
            id: String(o.id),
            en: String(o.en).trim(),
            locale: String(o.locale ?? o.en).trim(),
          })),
      };
      if (interaction.options.length < 2) interaction = null;
    }
    return { en, locale, interaction };
  } catch {
    return { en: raw.trim(), locale: fallbackLocale || raw.trim(), interaction: null };
  }
}

/** Standard tenure MCQ used after the introduction */
export function getTenureMcqInteraction(lang: Language): McqInteraction {
  const optionsEn = [
    "Less than 1 year",
    "2–5 years",
    "5–10 years",
    "More than 10 years",
  ];

  const optionsLocale: Record<Language, string[]> = {
    en: optionsEn,
    hi: ["1 वर्ष से कम", "2–5 वर्ष", "5–10 वर्ष", "10 वर्ष से अधिक"],
    or: ["1 ବର୍ଷରୁ କମ", "2–5 ବର୍ଷ", "5–10 ବର୍ଷ", "10 ବର୍ଷରୁ ଅଧିକ"],
    bn: ["১ বছরের কম", "২–৫ বছর", "৫–১০ বছর", "১০ বছরের বেশি"],
  };

  const localeOpts = optionsLocale[lang] ?? optionsEn;

  return {
    type: "mcq",
    allowFreeText: true,
    options: optionsEn.map((en, i) => ({
      id: `tenure-${i}`,
      en,
      locale: lang === "en" ? en : localeOpts[i] ?? en,
    })),
  };
}
