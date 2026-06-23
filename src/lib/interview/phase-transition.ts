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

export function buildPhase2TransitionMessage(
  config: CompanyPhaseConfig,
  lang: "en" | "hi" | "or" | "bn"
): { en: string; locale: string } {
  const en = `Thank you for the detailed conversation. We are now entering **${config.phase2Title}** — a set of structured, objective questions for your role. Please answer each question clearly and concisely.`;
  const localeMap: Record<string, string> = {
    en,
    hi: `विस्तृत बातचीत के लिए धन्यवाद। अब हम **${config.phase2Title}** चरण में प्रवेश कर रहे हैं — आपकी भूमिका से जुड़े संरचित, वस्तुनिष्ठ प्रश्न। कृपया प्रत्येक प्रश्न का स्पष्ट और संक्षिप्त उत्तर दें।`,
    or: `ବିସ୍ତୃତ କଥୋପକଥନ ପାଇଁ ଧନ୍ୟବାଦ। ଏବେ ଆମେ **${config.phase2Title}** ପର୍ଯ୍ୟାୟରେ ପ୍ରବେଶ କରୁଛୁ — ଆପଣଙ୍କ ଭୂମିକା ପାଇଁ ଗଠନମୂଳକ, ବସ୍ତୁନିଷ୍ଠ ପ୍ରଶ୍ନ। ଦୟାକରି ପ୍ରତ୍ୟେକ ପ୍ରଶ୍ନର ସ୍ପଷ୍ଟ ଉତ୍ତର ଦିଅନ୍ତୁ।`,
    bn: `বিস্তারিত আলোচনার জন্য ধন্যবাদ। এখন আমরা **${config.phase2Title}** পর্যায়ে প্রবেশ করছি — আপনার ভূমিকার জন্য কাঠামোগত, বস্তুনিষ্ঠ প্রশ্ন। অনুগ্রহ করে প্রতিটি প্রশ্নের স্পষ্ট ও সংক্ষিপ্ত উত্তর দিন।`,
  };
  return { en, locale: localeMap[lang] ?? en };
}
