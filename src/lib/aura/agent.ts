import {
  chatInterviewJson,
  chatNormalizeJson,
  chatReportJson,
} from "@/lib/ai/chat";
import { retrieveRelevantKnowledge } from "@/lib/ai/knowledge-retrieval";
import { hasClaudeProvider, hasOpenAIProvider } from "@/lib/ai/providers";
import {
  buildSystemPrompt,
  INTERVIEW_SECTIONS,
  type CompanyContext,
  type SectionId,
} from "./config";
import {
  type Language,
  SECTION_QUESTIONS_I18N,
  getAcknowledgments,
  getFollowUps,
} from "./i18n";
import {
  bilingualInstruction,
  englishInstruction,
  isPreferredLanguage,
  parseBilingualJson,
  type BilingualText,
} from "./bilingual";
import {
  parseAssistantPayload,
  serializeInteraction,
  type MessageInteraction,
} from "./interaction";

export interface SessionContext {
  sessionId: string;
  language: Language;
  company: CompanyContext;
  currentSection: SectionId;
  stakeholderType?: string | null;
  participant?: {
    fullName?: string | null;
    department?: string | null;
    designation?: string | null;
  } | null;
  messageHistory: { role: "user" | "assistant"; content: string }[];
  questionIndex: number;
  postIntro?: boolean;
}

export interface AuraResponse {
  content: string;
  contentLocale: string;
  nextSection: SectionId;
  nextQuestionIndex: number;
  completionPct: number;
  shouldComplete: boolean;
  interaction?: MessageInteraction | null;
  metadata?: string | null;
}

function getQuestions(lang: Language, section: SectionId): string[] {
  return SECTION_QUESTIONS_I18N[lang][section] ?? SECTION_QUESTIONS_I18N.en[section];
}

function calculateCompletion(section: SectionId, questionIndex: number): number {
  const sectionIdx = INTERVIEW_SECTIONS.findIndex((s) => s.id === section);
  const baseProgress = (sectionIdx / INTERVIEW_SECTIONS.length) * 100;
  const sectionProgress =
    (questionIndex / (getQuestions("en", section)?.length || 1)) *
    (INTERVIEW_SECTIONS[sectionIdx]?.weight ?? 10);
  return Math.min(99, Math.round(baseProgress + sectionProgress * 0.1));
}

function advanceSection(
  lang: Language,
  current: SectionId,
  questionIndex: number
): { section: SectionId; questionIndex: number } {
  const questions = getQuestions(lang, current);
  if (questionIndex + 1 < questions.length) {
    return { section: current, questionIndex: questionIndex + 1 };
  }

  const idx = INTERVIEW_SECTIONS.findIndex((s) => s.id === current);
  const next = INTERVIEW_SECTIONS[idx + 1];
  if (next) {
    return { section: next.id, questionIndex: 0 };
  }
  return { section: current, questionIndex };
}

function buildFallbackBilingual(ctx: SessionContext, userMessage: string): AuraResponse {
  const lang = ctx.language;
  const questions = getQuestions(lang, ctx.currentSection);
  const enQuestions = getQuestions("en", ctx.currentSection);
  const currentQ = questions[ctx.questionIndex] ?? questions[0];
  const currentQEn = enQuestions[ctx.questionIndex] ?? enQuestions[0];
  const ackEn = getAcknowledgments("en")[ctx.messageHistory.length % 3];
  const ackLoc = getAcknowledgments(lang)[ctx.messageHistory.length % 3];
  const followUpsEn = getFollowUps("en");
  const followUpsLoc = getFollowUps(lang);

  const userLower = userMessage.toLowerCase();
  const isShort = userMessage.trim().split(/\s+/).length < 8;

  let followUpEn = "";
  let followUpLoc = "";
  if (isShort) {
    followUpEn = followUpsEn.short;
    followUpLoc = followUpsLoc.short;
  } else if (userLower.includes("excel")) {
    followUpEn = followUpsEn.excel;
    followUpLoc = followUpsLoc.excel;
  } else if (userLower.includes("sap")) {
    followUpEn = followUpsEn.sap;
    followUpLoc = followUpsLoc.sap;
  } else if (userLower.includes("furnace") || userLower.includes("saf")) {
    followUpEn = followUpsEn.furnace;
    followUpLoc = followUpsLoc.furnace;
  } else if (userLower.includes("lab") || userLower.includes("analysis")) {
    followUpEn = followUpsEn.lab;
    followUpLoc = followUpsLoc.lab;
  } else {
    followUpEn = currentQEn;
    followUpLoc = currentQ;
  }

  const advanced = advanceSection(lang, ctx.currentSection, ctx.questionIndex);
  const nextQuestions = getQuestions(lang, advanced.section);
  const nextQuestionsEn = getQuestions("en", advanced.section);
  const nextQ = nextQuestions[advanced.questionIndex] ?? "";
  const nextQEn = nextQuestionsEn[advanced.questionIndex] ?? "";

  const allSectionsDone =
    ctx.currentSection === "J" &&
    ctx.questionIndex >= getQuestions(lang, "J").length - 1 &&
    !isShort;

  const confirmEn =
    `${ackEn} I believe we've covered the key areas. Could you please confirm — is everything we've discussed accurate and complete? If yes, I'll generate your comprehensive requirement report.`;
  const confirmLoc: Record<Language, string> = {
    en: confirmEn,
    hi: `${ackLoc} मुझे लगता है हमने सभी मुख्य areas cover कर लिए हैं। कृपया पुष्टि करें — क्या हमने जो चर्चा की वह सही और पूर्ण है?`,
    or: `${ackLoc} ମୁଁ ଭାବୁଛି ଆମେ ସବୁ key areas cover କରିସାରିଛୁ। ଦୟାକରି confirm କରନ୍ତୁ — ଆମେ discuss କରିଥିବା ସବୁ accurate ଏବଂ complete କି?`,
    bn: `${ackLoc} আমি মনে করি আমরা মূল বিষয়গুলো কভার করেছি। অনুগ্রহ করে নিশ্চিত করুন — আমরা যা আলোচনা করেছি তা কি সঠিক ও সম্পূর্ণ?`,
  };

  if (allSectionsDone) {
    return {
      content: confirmEn,
      contentLocale: confirmLoc[lang],
      nextSection: "J",
      nextQuestionIndex: ctx.questionIndex,
      completionPct: 95,
      shouldComplete: false,
    };
  }

  const showNext =
    nextQ && (advanced.section !== ctx.currentSection || advanced.questionIndex > ctx.questionIndex);
  const contentEn = `${ackEn}\n\n${followUpEn}${showNext ? `\n\n${nextQEn}` : ""}`.trim();
  const contentLocale = `${ackLoc}\n\n${followUpLoc}${showNext ? `\n\n${nextQ}` : ""}`.trim();

  return {
    content: contentEn,
    contentLocale,
    nextSection: advanced.section,
    nextQuestionIndex: advanced.questionIndex,
    completionPct: calculateCompletion(advanced.section, advanced.questionIndex),
    shouldComplete: false,
  };
}

export async function normalizeUserMessage(
  text: string,
  preferredLang: Language
): Promise<BilingualText> {
  if (preferredLang === "en") {
    return { en: text, locale: text };
  }

  if (!hasOpenAIProvider() && !hasClaudeProvider()) {
    return { en: text, locale: text };
  }

  try {
    const raw =
      (await chatNormalizeJson([
        {
          role: "system",
          content: `Return JSON only: {"en":"English translation for records","locale":"original or cleaned text in employee language"}
Employee preferred language: ${preferredLang}. Preserve meaning. If already English, duplicate appropriately in locale only if it was typed in preferred script.`,
        },
        { role: "user", content: text },
      ])) ?? "{}";
    const parsed = JSON.parse(raw) as { en?: string; locale?: string };
    return {
      en: parsed.en?.trim() || text,
      locale: parsed.locale?.trim() || text,
    };
  } catch {
    return { en: text, locale: text };
  }
}

export async function generateAuraResponse(
  ctx: SessionContext,
  userMessage: string
): Promise<AuraResponse> {
  const lang = ctx.language;

  if (!hasClaudeProvider() && !hasOpenAIProvider()) {
    return buildFallbackBilingual(ctx, userMessage);
  }

  const sectionInfo = INTERVIEW_SECTIONS.find((s) => s.id === ctx.currentSection);
  const questions = getQuestions(lang, ctx.currentSection);
  const enQuestions = getQuestions("en", ctx.currentSection);
  const designation = ctx.participant?.designation?.trim() || "not specified";

  let companyWithRetrieval = { ...ctx.company };
  if (ctx.company.slug) {
    const retrieved = await retrieveRelevantKnowledge({
      companySlug: ctx.company.slug,
      userMessage,
      sectionName: sectionInfo?.name ?? ctx.currentSection,
      designation,
    });
    if (retrieved.formattedContext) {
      companyWithRetrieval = {
        ...ctx.company,
        retrievedKnowledge: retrieved.formattedContext,
      };
    }
  }

  const systemPrompt = buildSystemPrompt(companyWithRetrieval);
  const department = ctx.participant?.department?.trim() || "not specified";
  const roleFocus = designation !== "not specified"
    ? `Employee role/designation: ${designation}. Department: ${department}.
IMPORTANT: Ask questions specific to a ${designation} at ${ctx.company.name}. Focus on their daily workflows, tools, approvals, handoffs, KPIs, and pain points for THIS post — avoid generic questions unrelated to their job.`
    : `Participant department: ${department}.`;

  const sectionPrompt = isPreferredLanguage(lang)
    ? `${bilingualInstruction(lang)}
${ctx.postIntro ? "POST-INTRO: The employee finished introduction (journey + tenure). Use company knowledge AND their answers. First deep-dive question MUST use MCQ when asking about frequency, volume, team size, tools, or severity.\n" : ""}
${roleFocus}
Current section: ${sectionInfo?.name} (${ctx.currentSection})
Client company: ${ctx.company.name}
Suggested focus questions (locale): ${questions.join(" | ")}
English reference questions: ${enQuestions.join(" | ")}
Question progress in section: ${ctx.questionIndex + 1}/${questions.length}
Participant: ${ctx.participant?.fullName ?? "unknown"} | ${department} | ${designation}`
    : `${englishInstruction()}
${ctx.postIntro ? "POST-INTRO: Employee finished introduction. First deep-dive MUST use MCQ when appropriate (frequency, scale, tools, severity).\n" : ""}${roleFocus}
Current section: ${sectionInfo?.name} (${ctx.currentSection})
Client company: ${ctx.company.name}
Suggested questions: ${enQuestions.join(" | ")}
Question progress: ${ctx.questionIndex + 1}/${questions.length}
Participant: ${ctx.participant?.fullName ?? "unknown"} | ${department} | ${designation}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "system" as const, content: sectionPrompt },
    ...ctx.messageHistory.slice(-12).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const raw =
    (await chatInterviewJson(messages)) ??
    buildFallbackBilingual(ctx, userMessage).content;

  const fallback = buildFallbackBilingual(ctx, userMessage);
  let bilingual: BilingualText;
  let interaction: MessageInteraction | null = null;

  if (isPreferredLanguage(lang)) {
    const parsed = parseAssistantPayload(raw, fallback.contentLocale);
    bilingual = { en: parsed.en, locale: parsed.locale };
    interaction = parsed.interaction;
    if (!parsed.en) {
      bilingual = parseBilingualJson(raw, fallback.contentLocale);
    }
  } else {
    const parsed = parseAssistantPayload(raw, raw);
    bilingual = { en: parsed.en || raw, locale: parsed.locale || parsed.en || raw };
    interaction = parsed.interaction;
  }

  const advanced = advanceSection(lang, ctx.currentSection, ctx.questionIndex);

  const confirmKeywords =
    /^(yes|correct|accurate|confirmed|complete|that's right|haan|हाँ|हां|ହଁ|ଠିକ|হ্যাঁ|ঠিক)/i;
  const currentCompletion = calculateCompletion(ctx.currentSection, ctx.questionIndex);
  const shouldComplete =
    ctx.currentSection === "J" &&
    currentCompletion >= 90 &&
    confirmKeywords.test(userMessage.trim());

  return {
    content: bilingual.en,
    contentLocale: bilingual.locale,
    nextSection: advanced.section,
    nextQuestionIndex: advanced.questionIndex,
    completionPct: calculateCompletion(advanced.section, advanced.questionIndex),
    shouldComplete,
    interaction,
    metadata: interaction ? serializeInteraction(interaction) : null,
  };
}

export async function generateInterviewReport(
  sessionData: {
    company?: CompanyContext | null;
    participant: Record<string, unknown> | null;
    messages: { role: string; content: string }[];
    processes: Record<string, unknown>[];
    painPoints: Record<string, unknown>[];
    requirements: Record<string, unknown>[];
  }
): Promise<Record<string, string>> {
  const companyName = sessionData.company?.name ?? "Client Company";
  const transcript = sessionData.messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const openai = hasOpenAIProvider();
  if (!hasClaudeProvider() && !openai) {
    return buildFallbackReport(sessionData, transcript);
  }

  const raw =
    (await chatReportJson([
      {
        role: "system",
        content: `Generate a comprehensive requirement gathering report for ${companyName} from this AURA-METNMAT interview. Return JSON with keys: executiveSummary, processDocumentation, requirements, painPointsSummary, integrationSummary, reportingSummary, risks, recommendations, architecture, actionItems. Each value should be detailed markdown.`,
      },
      { role: "user", content: transcript },
    ])) ?? "{}";
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return buildFallbackReport(sessionData, transcript);
  }
}

function buildFallbackReport(
  sessionData: {
    company?: CompanyContext | null;
    participant: Record<string, unknown> | null;
    messages: { role: string; content: string }[];
  },
  transcript: string
): Record<string, string> {
  const p = sessionData.participant;
  const companyName = sessionData.company?.name ?? "Client Company";
  return {
    executiveSummary: `## Business Overview\nInterview conducted via AURA-METNMAT for **${companyName}**.\n\n**Participant:** ${p?.fullName ?? "Not specified"} | ${p?.department ?? ""} | ${p?.designation ?? ""}\n\n**Mobile:** ${p?.mobile ?? "N/A"} | **Email:** ${p?.email ?? "N/A"}\n\n## Key Findings\nCaptured through structured stakeholder interview.\n\n## Major Challenges\nTo be prioritized based on pain points identified during interview.`,
    processDocumentation: `## Current Process\nDerived from interview transcript.\n\n## Workflow\n${transcript.slice(0, 2000)}...`,
    requirements: "## Functional Requirements\nCollected during interview.\n\n## Non-Functional Requirements\nPerformance, security, and accessibility needs documented.",
    painPointsSummary: "## High Priority\nManual processes and data inconsistency.\n\n## Medium Priority\nReporting delays and approval bottlenecks.",
    integrationSummary: "## Integration Requirements\nSAP/ERP, lab systems, Excel migration.",
    reportingSummary: "## Reporting Requirements\nFurnace KPI dashboards and metal analysis trends.",
    risks: "- Incomplete SAP module mapping\n- Excel dependency\n- Lab-to-production feedback delays",
    recommendations: "1. Centralize furnace data\n2. Replace Excel workflows\n3. Integrate SAP modules",
    architecture: "## Suggested Architecture\n- Reference DB + Interview DB + AURA Agent + Integration Layer",
    actionItems: "1. Complete stakeholder interviews\n2. Map SAP usage\n3. Document approval workflows",
  };
}
