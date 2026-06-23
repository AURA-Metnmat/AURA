import { db } from "@/lib/db";
import { parseInteraction, type MessageInteraction } from "@/lib/aura/interaction";
import type { Language } from "@/lib/aura/i18n";
import type { SectionId } from "@/lib/aura/config";

export interface FixedPhaseQuestionPayload {
  en: string;
  locale: string;
  interaction: MessageInteraction | null;
  section: SectionId | null;
  questionIndex: number;
  totalQuestions: number;
}

export async function countActivePhase2Questions(companyId: string): Promise<number> {
  return db.fixedPhaseQuestion.count({
    where: { companyId, isActive: true },
  });
}

export async function getFixedPhaseQuestionAt(
  companyId: string,
  index: number
): Promise<FixedPhaseQuestionPayload | null> {
  const total = await countActivePhase2Questions(companyId);
  if (total === 0 || index < 0 || index >= total) return null;

  const row = await db.fixedPhaseQuestion.findFirst({
    where: { companyId, isActive: true },
    orderBy: { sortOrder: "asc" },
    skip: index,
  });

  if (!row) return null;

  const interaction = row.interactionJson ? parseInteraction(row.interactionJson) : null;
  const en = row.promptEn.trim();
  const locale = row.promptLocale?.trim() || en;

  return {
    en,
    locale,
    interaction,
    section: (row.section as SectionId | null) ?? null,
    questionIndex: index,
    totalQuestions: total,
  };
}

export function formatPhase2QuestionForLanguage(
  payload: FixedPhaseQuestionPayload,
  lang: Language
): { en: string; locale: string } {
  if (lang === "en") {
    return { en: payload.en, locale: payload.en };
  }
  return { en: payload.en, locale: payload.locale };
}
