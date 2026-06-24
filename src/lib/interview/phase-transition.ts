import type { CompanyPhaseConfig } from "./phase-config";
import { INTERVIEW_PHASE, type InterviewPhase } from "./phase-config";

export interface PhaseProgress {
  phase: InterviewPhase;
  phase1RemainingSeconds: number | null;
  phase2RemainingSeconds: number | null;
  totalRemainingSeconds: number | null;
  phase1ElapsedSeconds: number;
  phase2ElapsedSeconds: number;
}

export function getPhaseProgress(params: {
  interviewPhase: string;
  phase1StartedAt: Date | null;
  phase2StartedAt: Date | null;
  startedAt: Date;
  config: CompanyPhaseConfig;
  now?: Date;
}): PhaseProgress {
  const now = params.now ?? new Date();
  const phase = (params.interviewPhase as InterviewPhase) || INTERVIEW_PHASE.PHASE1_AI;
  const phase1Start = params.phase1StartedAt ?? params.startedAt;
  const phase1ElapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - phase1Start.getTime()) / 1000)
  );
  const phase2ElapsedSeconds = params.phase2StartedAt
    ? Math.max(0, Math.floor((now.getTime() - params.phase2StartedAt.getTime()) / 1000))
    : 0;

  const phase1Limit = params.config.phase1DurationMinutes * 60;
  const phase2Limit = params.config.phase2DurationMinutes * 60;

  const phase1RemainingSeconds =
    phase === INTERVIEW_PHASE.PHASE1_AI
      ? Math.max(0, phase1Limit - phase1ElapsedSeconds)
      : phase === INTERVIEW_PHASE.PHASE1_COMPLETE
        ? 0
        : null;

  const phase2RemainingSeconds =
    phase === INTERVIEW_PHASE.PHASE2_FIXED && params.config.phase2Enabled
      ? Math.max(0, phase2Limit - phase2ElapsedSeconds)
      : null;

  const totalLimit = params.config.totalDurationMinutes * 60;
  const totalElapsed = Math.floor((now.getTime() - params.startedAt.getTime()) / 1000);

  return {
    phase,
    phase1RemainingSeconds,
    phase2RemainingSeconds,
    totalRemainingSeconds: Math.max(0, totalLimit - totalElapsed),
    phase1ElapsedSeconds,
    phase2ElapsedSeconds,
  };
}

export function shouldTransitionToPhase2(params: {
  interviewPhase: string;
  phase1StartedAt: Date | null;
  startedAt: Date;
  config: CompanyPhaseConfig;
  phase2QuestionCount: number;
  introStep: number;
  now?: Date;
}): boolean {
  if (!params.config.phase2Enabled) return false;
  if (params.phase2QuestionCount === 0) return false;
  if (params.interviewPhase !== INTERVIEW_PHASE.PHASE1_AI) return false;
  if ((params.introStep ?? 1) < 3) return false;

  const progress = getPhaseProgress({
    interviewPhase: params.interviewPhase,
    phase1StartedAt: params.phase1StartedAt,
    phase2StartedAt: null,
    startedAt: params.startedAt,
    config: params.config,
    now: params.now,
  });

  return progress.phase1RemainingSeconds !== null && progress.phase1RemainingSeconds <= 0;
}

export function isPhase1TimeExpired(params: {
  interviewPhase: string;
  phase1StartedAt: Date | null;
  startedAt: Date;
  config: CompanyPhaseConfig;
  introStep: number;
  now?: Date;
}): boolean {
  if (params.interviewPhase !== INTERVIEW_PHASE.PHASE1_AI) return false;
  if ((params.introStep ?? 1) < 3) return false;

  const progress = getPhaseProgress({
    interviewPhase: params.interviewPhase,
    phase1StartedAt: params.phase1StartedAt,
    phase2StartedAt: null,
    startedAt: params.startedAt,
    config: params.config,
    now: params.now,
  });

  return progress.phase1RemainingSeconds !== null && progress.phase1RemainingSeconds <= 0;
}

export function shouldCelebratePhase1Complete(params: {
  interviewPhase: string;
  phase1StartedAt: Date | null;
  startedAt: Date;
  config: CompanyPhaseConfig;
  phase2QuestionCount: number;
  introStep: number;
  now?: Date;
}): boolean {
  if (params.interviewPhase !== INTERVIEW_PHASE.PHASE1_AI) return false;
  if (!params.config.phase2Enabled || params.phase2QuestionCount === 0) return false;
  return isPhase1TimeExpired(params);
}

export function buildPhase1CompleteMessage(
  config: CompanyPhaseConfig,
  lang: "en" | "hi" | "or" | "bn"
): { en: string; locale: string } {
  const en = `Congratulations! You have completed **${config.phase1Title}**. Thank you for sharing your experience and insights with us. When you are ready, continue to **${config.phase2Title}** — a short structured assessment with predefined questions.`;
  const localeMap: Record<string, string> = {
    en,
    hi: `बधाई हो! आपने **${config.phase1Title}** पूरा कर लिया है। अपना अनुभव साझा करने के लिए धन्यवाद। जब तैयार हों, **${config.phase2Title}** जारी रखें — पूर्वनिर्धारित प्रश्नों के साथ एक संक्षिप्त मूल्यांकन।`,
    or: `ଅଭିନନ୍ଦନ! ଆପଣ **${config.phase1Title}** ସମ୍ପୂର୍ଣ୍ଣ କରିଛନ୍ତି। ଅନୁଭବ ସାଝା କରିଥିବା ପାଇଁ ଧନ୍ୟବାଦ। ପ୍ରସ୍ତୁତ ହେଲେ **${config.phase2Title}** ଆରମ୍ଭ କରନ୍ତୁ।`,
    bn: `অভিনন্দন! আপনি **${config.phase1Title}** সম্পন্ন করেছেন। অভিজ্ঞতা শেয়ার করার জন্য ধন্যবাদ। প্রস্তুত হলে **${config.phase2Title}** শুরু করুন — পূর্বনির্ধারিত প্রশ্নের সংক্ষিপ্ত মূল্যায়ন।`,
  };
  return { en, locale: localeMap[lang] ?? en };
}

export function buildPhase2IntroMessage(
  config: CompanyPhaseConfig,
  lang: "en" | "hi" | "or" | "bn"
): { en: string; locale: string } {
  const en = `**${config.phase2Title}** has started. Please answer each question below. Select an option where provided, or type your answer.`;
  const localeMap: Record<string, string> = {
    en,
    hi: `**${config.phase2Title}** शुरू हो गया है। कृपया प्रत्येक प्रश्न का उत्तर दें। विकल्प दिए गए हों तो चुनें, अन्यथा टाइप करें।`,
    or: `**${config.phase2Title}** ଆରମ୍ଭ ହୋଇଛି। ପ୍ରତ୍ୟେକ ପ୍ରଶ୍ନର ଉତ୍ତର ଦିଅନ୍ତୁ।`,
    bn: `**${config.phase2Title}** শুরু হয়েছে। প্রতিটি প্রশ্নের উত্তর দিন।`,
  };
  return { en, locale: localeMap[lang] ?? en };
}

export function buildInterviewThankYouMessage(
  companyName: string,
  lang: "en" | "hi" | "or" | "bn"
): { en: string; locale: string } {
  const en = `Thank you for completing the interview and helping us understand your work at ${companyName}. Your responses have been saved securely. We truly appreciate your time and contribution.`;
  const localeMap: Record<string, string> = {
    en,
    hi: `${companyName} में आपके कार्य को समझने में मदद करने के लिए धन्यवाद। आपके उत्तर सुरक्षित रूप से सहेजे गए हैं।`,
    or: `${companyName} ରେ ଆପଣଙ୍କ କାମ ବୁଝିବାରେ ସାହାଯ୍ୟ କରିଥିବା ପାଇଁ ଧନ୍ୟବାଦ।`,
    bn: `${companyName}-এ আপনার কাজ বোঝাতে সাহায্য করার জন্য ধন্যবাদ। আপনার উত্তর সংরক্ষিত হয়েছে।`,
  };
  return { en, locale: localeMap[lang] ?? en };
}

/** @deprecated Use buildPhase1CompleteMessage + buildPhase2IntroMessage */
export function buildPhase2TransitionMessage(
  config: CompanyPhaseConfig,
  lang: "en" | "hi" | "or" | "bn"
): { en: string; locale: string } {
  const complete = buildPhase1CompleteMessage(config, lang);
  const intro = buildPhase2IntroMessage(config, lang);
  return { en: `${complete.en}\n\n${intro.en}`, locale: `${complete.locale}\n\n${intro.locale}` };
}
