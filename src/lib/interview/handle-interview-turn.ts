import { db } from "@/lib/db";
import { generateAuraResponse } from "@/lib/aura/agent";
import { loadFullCompanyContext } from "@/lib/companies/company-knowledge";
import { serializeInteraction, type MessageInteraction } from "@/lib/aura/interaction";
import type { Language } from "@/lib/aura/i18n";
import type { SectionId } from "@/lib/aura/config";
import { buildPhaseConfig, INTERVIEW_PHASE, hasPendingPhase2, PHASE2_FINISHED_COMPLETION_PCT } from "./phase-config";
import {
  buildInterviewThankYouMessage,
  getPhaseProgress,
  shouldCelebratePhase1Complete,
} from "./phase-transition";
import { advanceInterviewPhase } from "./phase-advance";
import {
  countActivePhase2Questions,
  formatPhase2QuestionForLanguage,
  getFixedPhaseQuestionAt,
} from "./phase2-runner";

export interface InterviewTurnResult {
  sessionId: string;
  message: string;
  messageLocale: string;
  interaction: MessageInteraction | null;
  userMessageEn: string;
  userMessageLocale: string;
  currentSection: string;
  completionPct: number;
  shouldComplete: boolean;
  interviewPhase: string;
  phase1Title: string;
  phase2Title: string;
  phaseProgress: ReturnType<typeof getPhaseProgress>;
  fromPhase2?: boolean;
  phase2QuestionNumber?: number;
  phase2QuestionTotal?: number;
  phaseEvent?: "phase1_complete" | "phase2_started" | "phase2_complete";
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

export async function handlePostIntroInterviewTurn(params: {
  session: {
    id: string;
    companyId: string;
    interviewPhase: string;
    phase2QuestionIndex: number;
    phase1StartedAt: Date | null;
    phase2StartedAt: Date | null;
    startedAt: Date;
    currentSection: string;
    questionIndex: number;
    completionPct: number;
    stakeholderType: string | null;
    company: {
      name: string;
      industry: string | null;
      description: string | null;
      aiContext: string | null;
      slug: string;
      phase1DurationMinutes: number;
      phase2DurationMinutes: number;
      phase2Enabled: boolean;
      phase1Title: string;
      phase2Title: string;
      interviewDurationMinutes: number;
    };
    participant: {
      fullName: string;
      designation: string | null;
      department: string | null;
    } | null;
  };
  lang: Language;
  userBilingual: { en: string; locale: string };
  updatedHistory: { role: "user" | "assistant"; content: string }[];
  introStep: number;
}): Promise<InterviewTurnResult> {
  const { session, lang, userBilingual, updatedHistory, introStep } = params;
  const config = buildPhaseConfig(session.company);
  const phase2Count = await countActivePhase2Questions(session.companyId);
  let interviewPhase = session.interviewPhase;

  if (interviewPhase === INTERVIEW_PHASE.PHASE2_FIXED && phase2Count === 0) {
    await db.interviewSession.update({
      where: { id: session.id },
      data: { interviewPhase: INTERVIEW_PHASE.PHASE1_AI },
    });
    interviewPhase = INTERVIEW_PHASE.PHASE1_AI;
  }

  const phaseProgress = getPhaseProgress({
    interviewPhase,
    phase1StartedAt: session.phase1StartedAt,
    phase2StartedAt: session.phase2StartedAt,
    startedAt: session.startedAt,
    config,
  });

  const baseResponse = {
    sessionId: session.id,
    userMessageEn: userBilingual.en,
    userMessageLocale: userBilingual.locale,
    interviewPhase,
    phase1Title: config.phase1Title,
    phase2Title: config.phase2Title,
    phaseProgress,
  };

  if (interviewPhase === INTERVIEW_PHASE.PHASE1_COMPLETE) {
    const started = await advanceInterviewPhase({
      session: { ...session, introStep },
      lang,
      trigger: "start_phase2",
    });
    if (started) {
      return {
        sessionId: session.id,
        message: started.message,
        messageLocale: started.messageLocale,
        interaction: started.interaction,
        userMessageEn: userBilingual.en,
        userMessageLocale: userBilingual.locale,
        currentSection: started.currentSection,
        completionPct: started.completionPct,
        shouldComplete: false,
        interviewPhase: started.interviewPhase,
        phase1Title: started.phase1Title,
        phase2Title: started.phase2Title,
        phaseProgress: started.phaseProgress,
        fromPhase2: true,
        phase2QuestionNumber: started.phase2QuestionNumber,
        phase2QuestionTotal: started.phase2QuestionTotal,
        phaseEvent: "phase2_started",
        introMessage: started.introMessage,
        introMessageLocale: started.introMessageLocale,
      };
    }
  }

  if (interviewPhase === INTERVIEW_PHASE.PHASE2_FIXED && phase2Count > 0) {
    const nextIndex = session.phase2QuestionIndex + 1;
    const total = phase2Count;

    if (total > 0 && nextIndex >= total) {
      const completionPct = PHASE2_FINISHED_COMPLETION_PCT;
      const thanks = buildInterviewThankYouMessage(session.company.name, lang);
      await db.message.create({
        data: {
          sessionId: session.id,
          role: "assistant",
          content: thanks.en,
          contentLocale: thanks.locale,
          section: session.currentSection,
        },
      });
      await db.interviewSession.update({
        where: { id: session.id },
        data: { completionPct },
      });
      return {
        ...baseResponse,
        message: thanks.en,
        messageLocale: thanks.locale,
        interaction: null,
        currentSection: session.currentSection,
        completionPct,
        shouldComplete: true,
        interviewPhase: INTERVIEW_PHASE.PHASE2_FIXED,
        phaseEvent: "phase2_complete",
        phaseProgress: getPhaseProgress({
          interviewPhase: INTERVIEW_PHASE.PHASE2_FIXED,
          phase1StartedAt: session.phase1StartedAt,
          phase2StartedAt: session.phase2StartedAt,
          startedAt: session.startedAt,
          config,
        }),
      };
    }

    const nextQuestion = await getFixedPhaseQuestionAt(session.companyId, nextIndex);
    const formatted = formatFixedQuestionMessage(nextQuestion, lang);
    const interaction = nextQuestion?.interaction ?? null;
    const metadata = interaction ? serializeInteraction(interaction) : null;
    const section = nextQuestion?.section ?? session.currentSection;
    const completionPct = Math.min(
      99,
      50 + Math.round(((nextIndex + 1) / Math.max(total, 1)) * 45)
    );

    // Atomic: the next-question message and the phase2QuestionIndex advance must
    // commit together, or a retry could re-serve / skip a question.
    await db.$transaction([
      db.message.create({
        data: {
          sessionId: session.id,
          role: "assistant",
          content: formatted.en,
          contentLocale: formatted.locale,
          metadata,
          section,
        },
      }),
      db.interviewSession.update({
        where: { id: session.id },
        data: {
          phase2QuestionIndex: nextIndex,
          currentSection: section,
          completionPct,
          introStep: Math.max(introStep, 3),
        },
      }),
    ]);

    return {
      ...baseResponse,
      message: formatted.en,
      messageLocale: formatted.locale,
      interaction,
      currentSection: section,
      completionPct,
      shouldComplete: false,
      interviewPhase: INTERVIEW_PHASE.PHASE2_FIXED,
      fromPhase2: true,
      phase2QuestionNumber: nextIndex + 1,
      phase2QuestionTotal: total,
      phaseProgress: getPhaseProgress({
        interviewPhase: INTERVIEW_PHASE.PHASE2_FIXED,
        phase1StartedAt: session.phase1StartedAt,
        phase2StartedAt: session.phase2StartedAt,
        startedAt: session.startedAt,
        config,
      }),
    };
  }

  const celebrating = shouldCelebratePhase1Complete({
    interviewPhase,
    phase1StartedAt: session.phase1StartedAt,
    startedAt: session.startedAt,
    config,
    phase2QuestionCount: phase2Count,
    introStep,
  });

  if (celebrating) {
    const advanced = await advanceInterviewPhase({
      session: { ...session, introStep },
      lang,
      trigger: "timer",
    });
    if (advanced) {
      return {
        sessionId: session.id,
        message: advanced.message,
        messageLocale: advanced.messageLocale,
        interaction: null,
        userMessageEn: userBilingual.en,
        userMessageLocale: userBilingual.locale,
        currentSection: advanced.currentSection,
        completionPct: advanced.completionPct,
        shouldComplete: false,
        interviewPhase: advanced.interviewPhase,
        phase1Title: advanced.phase1Title,
        phase2Title: advanced.phase2Title,
        phaseProgress: advanced.phaseProgress,
        phaseEvent: "phase1_complete",
      };
    }
  }

  const companyCtx = await loadFullCompanyContext(
    {
      name: session.company.name,
      industry: session.company.industry,
      description: session.company.description,
      aiContext: session.company.aiContext,
      slug: session.company.slug,
    },
    { lite: true }
  );

  const postIntro = introStep === 2;
  const activeSection = postIntro
    ? ("B" as SectionId)
    : (session.currentSection as SectionId);
  const questionIndex = session.questionIndex ?? 0;
  const phase1Start = session.phase1StartedAt ?? new Date();

  const response = await generateAuraResponse(
    {
      sessionId: session.id,
      language: lang,
      company: companyCtx,
      currentSection: activeSection,
      stakeholderType: session.stakeholderType,
      participant: session.participant,
      messageHistory: updatedHistory,
      questionIndex,
      postIntro,
      campaignGuidance: null,
    },
    userBilingual.en
  );

  const metadata =
    response.metadata ??
    (response.interaction ? serializeInteraction(response.interaction) : null);

  await db.message.create({
    data: {
      sessionId: session.id,
      role: "assistant",
      content: response.content,
      contentLocale: response.contentLocale,
      metadata,
      section: response.nextSection,
    },
  });

  const phase2Pending = hasPendingPhase2(config, phase2Count);
  const shouldComplete = response.shouldComplete && !phase2Pending;

  await db.interviewSession.update({
    where: { id: session.id },
    data: {
      introStep: Math.max(introStep, 3),
      currentSection: response.nextSection,
      questionIndex: response.nextQuestionIndex,
      phase1StartedAt: session.phase1StartedAt ?? phase1Start,
      completionPct: response.completionPct,
    },
  });

  return {
    ...baseResponse,
    message: response.content,
    messageLocale: response.contentLocale,
    interaction: response.interaction ?? null,
    currentSection: response.nextSection,
    completionPct: response.completionPct,
    shouldComplete,
    interviewPhase: INTERVIEW_PHASE.PHASE1_AI,
    phaseProgress: getPhaseProgress({
      interviewPhase: INTERVIEW_PHASE.PHASE1_AI,
      phase1StartedAt: session.phase1StartedAt ?? phase1Start,
      phase2StartedAt: null,
      startedAt: session.startedAt,
      config,
    }),
  };
}
