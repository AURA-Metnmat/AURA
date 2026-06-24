import { db } from "@/lib/db";
import { serializeInteraction, type MessageInteraction } from "@/lib/aura/interaction";
import type { Language } from "@/lib/aura/i18n";
import { buildPhaseConfig, INTERVIEW_PHASE } from "./phase-config";
import {
  buildPhase1CompleteMessage,
  buildPhase2IntroMessage,
  getPhaseProgress,
  shouldCelebratePhase1Complete,
  type PhaseProgress,
} from "./phase-transition";
import {
  countActivePhase2Questions,
  formatPhase2QuestionForLanguage,
  getFixedPhaseQuestionAt,
} from "./phase2-runner";

export type PhaseAdvanceTrigger = "timer" | "start_phase2";

export type PhaseEvent =
  | "phase1_complete"
  | "phase2_started"
  | "already_in_phase2"
  | "not_ready";

export interface PhaseAdvanceResult {
  sessionId: string;
  interviewPhase: string;
  phaseEvent: PhaseEvent;
  message: string;
  messageLocale: string;
  interaction: MessageInteraction | null;
  currentSection: string;
  completionPct: number;
  shouldComplete: boolean;
  phase1Title: string;
  phase2Title: string;
  phaseProgress: PhaseProgress;
  phase2QuestionNumber?: number;
  phase2QuestionTotal?: number;
  phase2Enabled: boolean;
  introMessage?: string;
  introMessageLocale?: string;
}

function formatFixedQuestionMessage(
  payload: Awaited<ReturnType<typeof getFixedPhaseQuestionAt>>,
  lang: Language
): { en: string; locale: string } {
  if (!payload) return { en: "", locale: "" };
  const text = formatPhase2QuestionForLanguage(payload, lang);
  const prefix = `Question ${payload.questionIndex + 1} of ${payload.totalQuestions}: `;
  return {
    en: `${prefix}${text.en}`,
    locale: `${prefix}${text.locale}`,
  };
}

type SessionForAdvance = {
  id: string;
  companyId: string;
  interviewPhase: string;
  phase2QuestionIndex: number;
  phase1StartedAt: Date | null;
  phase2StartedAt: Date | null;
  startedAt: Date;
  currentSection: string;
  completionPct: number;
  introStep: number;
  company: {
    name: string;
    phase1DurationMinutes: number;
    phase2DurationMinutes: number;
    phase2Enabled: boolean;
    phase1Title: string;
    phase2Title: string;
    interviewDurationMinutes: number;
  };
};

function baseFields(
  session: SessionForAdvance,
  interviewPhase: string,
  phaseProgress: PhaseProgress
): Pick<
  PhaseAdvanceResult,
  "sessionId" | "interviewPhase" | "phase1Title" | "phase2Title" | "phaseProgress" | "phase2Enabled"
> {
  const config = buildPhaseConfig(session.company);
  return {
    sessionId: session.id,
    interviewPhase,
    phase1Title: config.phase1Title,
    phase2Title: config.phase2Title,
    phaseProgress,
    phase2Enabled: config.phase2Enabled,
  };
}

export async function advanceInterviewPhase(params: {
  session: SessionForAdvance;
  lang: Language;
  trigger: PhaseAdvanceTrigger;
}): Promise<PhaseAdvanceResult | null> {
  const { session, lang, trigger } = params;
  const config = buildPhaseConfig(session.company);
  const phase2Count = await countActivePhase2Questions(session.companyId);

  if (session.interviewPhase === INTERVIEW_PHASE.PHASE2_FIXED) {
    const phaseProgress = getPhaseProgress({
      interviewPhase: session.interviewPhase,
      phase1StartedAt: session.phase1StartedAt,
      phase2StartedAt: session.phase2StartedAt,
      startedAt: session.startedAt,
      config,
    });
    return {
      ...baseFields(session, session.interviewPhase, phaseProgress),
      phaseEvent: "already_in_phase2",
      message: "",
      messageLocale: "",
      interaction: null,
      currentSection: session.currentSection,
      completionPct: session.completionPct,
      shouldComplete: false,
      phase2QuestionNumber: session.phase2QuestionIndex + 1,
      phase2QuestionTotal: phase2Count,
    };
  }

  if (trigger === "start_phase2") {
    if (session.interviewPhase !== INTERVIEW_PHASE.PHASE1_COMPLETE) {
      return null;
    }
    return startPhase2Questions(session, lang, config, phase2Count);
  }

  if (trigger === "timer") {
    if (
      !shouldCelebratePhase1Complete({
        interviewPhase: session.interviewPhase,
        phase1StartedAt: session.phase1StartedAt,
        startedAt: session.startedAt,
        config,
        phase2QuestionCount: phase2Count,
        introStep: session.introStep,
      })
    ) {
      return null;
    }
    return celebratePhase1Complete(session, lang, config);
  }

  return null;
}

async function celebratePhase1Complete(
  session: SessionForAdvance,
  lang: Language,
  config: ReturnType<typeof buildPhaseConfig>
): Promise<PhaseAdvanceResult> {
  const celebration = buildPhase1CompleteMessage(config, lang);
  const completionPct = Math.max(session.completionPct, 40);

  await db.message.create({
    data: {
      sessionId: session.id,
      role: "assistant",
      content: celebration.en,
      contentLocale: celebration.locale,
      section: session.currentSection,
    },
  });

  await db.interviewSession.update({
    where: { id: session.id },
    data: {
      interviewPhase: INTERVIEW_PHASE.PHASE1_COMPLETE,
      completionPct,
      introStep: Math.max(session.introStep, 3),
    },
  });

  const phaseProgress = getPhaseProgress({
    interviewPhase: INTERVIEW_PHASE.PHASE1_COMPLETE,
    phase1StartedAt: session.phase1StartedAt,
    phase2StartedAt: null,
    startedAt: session.startedAt,
    config,
  });

  return {
    ...baseFields(session, INTERVIEW_PHASE.PHASE1_COMPLETE, phaseProgress),
    phaseEvent: "phase1_complete",
    message: celebration.en,
    messageLocale: celebration.locale,
    interaction: null,
    currentSection: session.currentSection,
    completionPct,
    shouldComplete: false,
  };
}

async function startPhase2Questions(
  session: SessionForAdvance,
  lang: Language,
  config: ReturnType<typeof buildPhaseConfig>,
  phase2Count: number
): Promise<PhaseAdvanceResult | null> {
  if (phase2Count === 0) return null;

  const intro = buildPhase2IntroMessage(config, lang);
  const firstQuestion = await getFixedPhaseQuestionAt(session.companyId, 0);
  if (!firstQuestion) return null;

  const formatted = formatFixedQuestionMessage(firstQuestion, lang);
  const interaction = firstQuestion.interaction ?? null;
  const metadata = interaction ? serializeInteraction(interaction) : null;
  const section = firstQuestion.section ?? session.currentSection;
  const now = new Date();
  const completionPct = Math.max(session.completionPct, 45);

  await db.message.create({
    data: {
      sessionId: session.id,
      role: "assistant",
      content: intro.en,
      contentLocale: intro.locale,
      section,
    },
  });

  await db.message.create({
    data: {
      sessionId: session.id,
      role: "assistant",
      content: formatted.en,
      contentLocale: formatted.locale,
      metadata,
      section,
    },
  });

  await db.interviewSession.update({
    where: { id: session.id },
    data: {
      interviewPhase: INTERVIEW_PHASE.PHASE2_FIXED,
      phase2StartedAt: now,
      phase2QuestionIndex: 0,
      currentSection: section,
      completionPct,
      introStep: Math.max(session.introStep, 3),
    },
  });

  const phaseProgress = getPhaseProgress({
    interviewPhase: INTERVIEW_PHASE.PHASE2_FIXED,
    phase1StartedAt: session.phase1StartedAt,
    phase2StartedAt: now,
    startedAt: session.startedAt,
    config,
  });

  return {
    ...baseFields(session, INTERVIEW_PHASE.PHASE2_FIXED, phaseProgress),
    phaseEvent: "phase2_started",
    message: formatted.en,
    messageLocale: formatted.locale,
    interaction,
    currentSection: section,
    completionPct,
    shouldComplete: false,
    phase2QuestionNumber: 1,
    phase2QuestionTotal: phase2Count,
    introMessage: intro.en,
    introMessageLocale: intro.locale,
  };
}
