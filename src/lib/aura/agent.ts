import OpenAI from "openai";
import { env } from "@/lib/env";
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
  languageInstruction,
} from "./i18n";

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
}

function getQuestions(lang: Language, section: SectionId): string[] {
  return SECTION_QUESTIONS_I18N[lang][section] ?? SECTION_QUESTIONS_I18N.en[section];
}

function getOpenAIClient(): OpenAI | null {
  try {
    const apiKey = env().openaiApiKey;
    return new OpenAI({ apiKey });
  } catch {
    return null;
  }
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

function buildFallbackResponse(ctx: SessionContext, userMessage: string): {
  content: string;
  nextSection: SectionId;
  nextQuestionIndex: number;
  completionPct: number;
  shouldComplete: boolean;
} {
  const lang = ctx.language;
  const questions = getQuestions(lang, ctx.currentSection);
  const currentQ = questions[ctx.questionIndex] ?? questions[0];
  const acks = getAcknowledgments(lang);
  const ack = acks[ctx.messageHistory.length % acks.length];
  const followUps = getFollowUps(lang);

  const userLower = userMessage.toLowerCase();
  const isShort = userMessage.trim().split(/\s+/).length < 8;

  let followUp = "";
  if (isShort) {
    followUp = followUps.short;
  } else if (userLower.includes("excel")) {
    followUp = followUps.excel;
  } else if (userLower.includes("sap")) {
    followUp = followUps.sap;
  } else if (userLower.includes("approv")) {
    followUp = currentQ;
  } else if (userLower.includes("furnace") || userLower.includes("saf")) {
    followUp = followUps.furnace;
  } else if (userLower.includes("lab") || userLower.includes("analysis")) {
    followUp = followUps.lab;
  } else {
    followUp = currentQ;
  }

  const advanced = advanceSection(lang, ctx.currentSection, ctx.questionIndex);
  const nextQuestions = getQuestions(lang, advanced.section);
  const nextQ = nextQuestions[advanced.questionIndex] ?? "";

  const allSectionsDone =
    ctx.currentSection === "J" &&
    ctx.questionIndex >= getQuestions(lang, "J").length - 1 &&
    !isShort;

  const confirmMessages: Record<Language, string> = {
    en: `${ack} I believe we've covered the key areas. Could you please confirm — is everything we've discussed accurate and complete? If yes, I'll generate your comprehensive requirement report.`,
    hi: `${ack} मुझे लगता है हमने सभी मुख्य areas cover कर लिए हैं। कृपया पुष्टि करें — क्या हमने जो चर्चा की वह सही और पूर्ण है? यदि हाँ, तो मैं आपकी comprehensive requirement report तैयार करूँगा।`,
    or: `${ack} ମୁଁ ଭାବୁଛି ଆମେ ସବୁ key areas cover କରିସାରିଛୁ। ଦୟାକରି confirm କରନ୍ତୁ — ଆମେ discuss କରିଥିବା ସବୁ accurate ଏବଂ complete କି? ହଁ ହେଲେ, ମୁଁ comprehensive requirement report generate କରିବି।`,
  };

  if (allSectionsDone) {
    return {
      content: confirmMessages[lang],
      nextSection: "J",
      nextQuestionIndex: ctx.questionIndex,
      completionPct: 95,
      shouldComplete: false,
    };
  }

  const content = `${ack}\n\n${followUp}${nextQ && (advanced.section !== ctx.currentSection || advanced.questionIndex > ctx.questionIndex) ? `\n\n${nextQ}` : ""}`.trim();

  return {
    content,
    nextSection: advanced.section,
    nextQuestionIndex: advanced.questionIndex,
    completionPct: calculateCompletion(advanced.section, advanced.questionIndex),
    shouldComplete: false,
  };
}

export async function generateAuraResponse(
  ctx: SessionContext,
  userMessage: string
): Promise<{
  content: string;
  nextSection: SectionId;
  nextQuestionIndex: number;
  completionPct: number;
  shouldComplete: boolean;
}> {
  const openai = getOpenAIClient();
  const lang = ctx.language;

  if (!openai) {
    return buildFallbackResponse(ctx, userMessage);
  }

  const sectionInfo = INTERVIEW_SECTIONS.find((s) => s.id === ctx.currentSection);
  const questions = getQuestions(lang, ctx.currentSection);
  const systemPrompt = buildSystemPrompt(ctx.company);
  const sectionPrompt = `${languageInstruction(lang)}
Current section: ${sectionInfo?.name} (${ctx.currentSection})
Client company: ${ctx.company.name}
Suggested focus questions: ${questions.join(" | ")}
Question progress in section: ${ctx.questionIndex + 1}/${questions.length}
Participant: ${ctx.participant?.fullName ?? "unknown"} | ${ctx.participant?.department ?? ""} | ${ctx.participant?.designation ?? ""}

Respond with ONE acknowledgment and ONE follow-up question only. Never ask multiple questions at once.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "system", content: sectionPrompt },
    ...ctx.messageHistory.slice(-12).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.7,
    max_tokens: 500,
  });

  const content =
    completion.choices[0]?.message?.content ??
    buildFallbackResponse(ctx, userMessage).content;

  const advanced = advanceSection(lang, ctx.currentSection, ctx.questionIndex);

  const confirmKeywords =
    /^(yes|correct|accurate|confirmed|complete|that's right|haan|हाँ|हां|ହଁ|ଠିକ)/i;
  const currentCompletion = calculateCompletion(ctx.currentSection, ctx.questionIndex);
  const shouldComplete =
    ctx.currentSection === "J" &&
    currentCompletion >= 90 &&
    confirmKeywords.test(userMessage.trim());

  return {
    content,
    nextSection: advanced.section,
    nextQuestionIndex: advanced.questionIndex,
    completionPct: calculateCompletion(advanced.section, advanced.questionIndex),
    shouldComplete,
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

  const openai = getOpenAIClient();
  if (!openai) {
    return buildFallbackReport(sessionData, transcript);
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Generate a comprehensive requirement gathering report for ${companyName} from this AURA-METNMAT interview. Return JSON with keys: executiveSummary, processDocumentation, requirements, painPointsSummary, integrationSummary, reportingSummary, risks, recommendations, architecture, actionItems. Each value should be detailed markdown.`,
      },
      { role: "user", content: transcript },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
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
