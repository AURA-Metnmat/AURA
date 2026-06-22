import { db } from "@/lib/db";
import type { Language } from "@/lib/aura/i18n";
import { parseInteraction, serializeInteraction, type MessageInteraction } from "@/lib/aura/interaction";
import type { SectionId } from "@/lib/aura/config";

export interface CampaignQuestionPayload {
  en: string;
  locale: string;
  interaction: MessageInteraction | null;
  metadata: string | null;
  section: SectionId | null;
  questionIndex: number;
}

export async function getNextCampaignQuestion(
  sessionId: string,
  lang: Language
): Promise<CampaignQuestionPayload | null> {
  const session = await db.interviewSession.findUnique({
    where: { id: sessionId },
    select: {
      campaignId: true,
      campaignQuestionIndex: true,
      introStep: true,
    },
  });

  if (!session?.campaignId || (session.introStep ?? 1) < 2) {
    return null;
  }

  const link = await db.campaignQuestion.findFirst({
    where: {
      campaignId: session.campaignId,
      sortOrder: session.campaignQuestionIndex,
    },
    include: { questionVersion: true },
  });

  if (!link) return null;

  const version = link.questionVersion;
  const en = version.promptEn.trim();
  const locale = lang === "en" ? en : (version.promptLocale?.trim() || en);
  const interaction = version.interactionJson
    ? parseInteraction(version.interactionJson)
    : null;
  const section = (link.section ?? version.section ?? null) as SectionId | null;

  return {
    en,
    locale,
    interaction,
    metadata: interaction ? serializeInteraction(interaction) : null,
    section,
    questionIndex: session.campaignQuestionIndex,
  };
}

export async function hasRemainingCampaignQuestions(
  campaignId: string,
  questionIndex: number
): Promise<boolean> {
  const next = await db.campaignQuestion.findFirst({
    where: { campaignId, sortOrder: questionIndex },
    select: { id: true },
  });
  return !!next;
}
