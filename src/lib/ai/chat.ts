import {
  getAnthropicClient,
  getOpenAIClient,
  splitSystemMessages,
  type ChatMessage,
} from "./providers";
import {
  CLAUDE_INTERVIEW_MODEL,
  CLAUDE_REPORT_MODEL,
  OPENAI_CHAT_MODEL,
} from "./models";
import {
  INTERVIEW_REFINE_SYSTEM,
  isDualModelActive,
  mergeReportFields,
  REPORT_ENHANCE_SYSTEM,
} from "./ai-config";
import {
  getInterviewMaxTokens,
  isInterviewDualRefineEnabled,
  isNormalizeDualPolishEnabled,
  isReportDualEnhanceEnabled,
} from "./performance-config";

export interface ChatJsonOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Claude model override */
  claudeModel?: string;
  /** Prefer Claude first (default true) */
  preferClaude?: boolean;
}

async function chatJsonClaude(
  messages: ChatMessage[],
  model: string,
  temperature: number,
  maxTokens: number
): Promise<string | null> {
  const client = getAnthropicClient();
  if (!client) return null;

  const { system, conversation } = splitSystemMessages(messages);
  const anthropicMessages = conversation
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  if (anthropicMessages.length === 0) return null;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: system || undefined,
      messages: anthropicMessages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.type === "text" ? textBlock.text.trim() : null;
  } catch (error) {
    console.warn("Claude chat failed:", error);
    return null;
  }
}

async function chatJsonOpenAI(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<string | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  try {
    const completion = await client.chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      response_format: { type: "json_object" },
      temperature,
      max_tokens: maxTokens,
    });
    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch (error) {
    console.warn("OpenAI chat failed:", error);
    return null;
  }
}

/**
 * JSON-oriented chat: Claude primary, OpenAI secondary fallback.
 */
export async function chatJson(options: ChatJsonOptions): Promise<string | null> {
  const {
    messages,
    temperature = 0.5,
    maxTokens = 1024,
    claudeModel = CLAUDE_INTERVIEW_MODEL,
    preferClaude = true,
  } = options;

  const jsonHint: ChatMessage = {
    role: "system",
    content:
      "You must respond with valid JSON only — no markdown fences, no prose outside the JSON object.",
  };

  const withJsonHint = [...messages, jsonHint];

  if (preferClaude) {
    const claudeRaw = await chatJsonClaude(withJsonHint, claudeModel, temperature, maxTokens);
    if (claudeRaw) return claudeRaw;
    return chatJsonOpenAI(withJsonHint, temperature, maxTokens);
  }

  const openaiRaw = await chatJsonOpenAI(withJsonHint, temperature, maxTokens);
  if (openaiRaw) return openaiRaw;
  return chatJsonClaude(withJsonHint, claudeModel, temperature, maxTokens);
}

/**
 * Interview turns — dual-model when both keys: Claude drafts, OpenAI refines; else fallback chain.
 */
export async function chatInterviewJson(messages: ChatMessage[]): Promise<string | null> {
  const baseOptions = {
    temperature: 0.55,
    maxTokens: getInterviewMaxTokens(),
    claudeModel: CLAUDE_INTERVIEW_MODEL,
  };

  if (!isDualModelActive() || !isInterviewDualRefineEnabled()) {
    return chatJson({
      messages,
      ...baseOptions,
      preferClaude: true,
    });
  }

  const claudeDraft = await chatJson({
    messages,
    ...baseOptions,
    preferClaude: true,
  });

  if (!claudeDraft) {
    return chatJson({
      messages,
      ...baseOptions,
      preferClaude: false,
    });
  }

  const refined = await chatJson({
    messages: [
      { role: "system", content: INTERVIEW_REFINE_SYSTEM },
      { role: "user", content: claudeDraft },
    ],
    temperature: 0.35,
    maxTokens: 900,
    claudeModel: CLAUDE_INTERVIEW_MODEL,
    preferClaude: false,
  });

  return refined || claudeDraft;
}

/**
 * Final reports — dual-model: Claude full draft, OpenAI enhances executive sections.
 */
export async function chatReportJson(messages: ChatMessage[]): Promise<string | null> {
  const baseOptions = {
    temperature: 0.4,
    maxTokens: 4096,
    claudeModel: CLAUDE_REPORT_MODEL,
  };

  if (!isDualModelActive() || !isReportDualEnhanceEnabled()) {
    return chatJson({
      messages,
      ...baseOptions,
      preferClaude: true,
    });
  }

  const claudeDraft = await chatJson({
    messages,
    ...baseOptions,
    preferClaude: true,
  });

  if (!claudeDraft) {
    return chatJson({
      messages,
      ...baseOptions,
      preferClaude: false,
    });
  }

  let baseReport: Record<string, string>;
  try {
    baseReport = JSON.parse(claudeDraft) as Record<string, string>;
  } catch {
    return claudeDraft;
  }

  const enhancedRaw = await chatJson({
    messages: [
      { role: "system", content: REPORT_ENHANCE_SYSTEM },
      { role: "user", content: claudeDraft },
    ],
    temperature: 0.3,
    maxTokens: 4096,
    claudeModel: CLAUDE_REPORT_MODEL,
    preferClaude: false,
  });

  if (!enhancedRaw) return claudeDraft;

  try {
    const enhanced = JSON.parse(enhancedRaw) as Record<string, string>;
    return JSON.stringify(mergeReportFields(baseReport, enhanced));
  } catch {
    return claudeDraft;
  }
}

/**
 * Fast translation / normalization — dual-model: OpenAI draft, Claude polishes locale script.
 */
export async function chatNormalizeJson(messages: ChatMessage[]): Promise<string | null> {
  if (!isDualModelActive() || !isNormalizeDualPolishEnabled()) {
    const openaiRaw = await chatJsonOpenAI(messages, 0.2, 400);
    if (openaiRaw) return openaiRaw;

    return chatJson({
      messages,
      temperature: 0.2,
      maxTokens: 400,
      claudeModel: CLAUDE_INTERVIEW_MODEL,
      preferClaude: true,
    });
  }

  const openaiDraft = await chatJsonOpenAI(messages, 0.2, 400);
  if (!openaiDraft) {
    return chatJson({
      messages,
      temperature: 0.2,
      maxTokens: 400,
      claudeModel: CLAUDE_INTERVIEW_MODEL,
      preferClaude: true,
    });
  }

  const polished = await chatJson({
    messages: [
      {
        role: "system",
        content:
          "Polish bilingual JSON for accuracy and native script quality in locale field. Return valid JSON only with keys en and locale.",
      },
      { role: "user", content: openaiDraft },
    ],
    temperature: 0.2,
    maxTokens: 400,
    claudeModel: CLAUDE_INTERVIEW_MODEL,
    preferClaude: true,
  });

  return polished || openaiDraft;
}
