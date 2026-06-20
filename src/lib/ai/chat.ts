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
 * Interview turns — Claude Sonnet for depth, OpenAI mini as fallback.
 */
export async function chatInterviewJson(messages: ChatMessage[]): Promise<string | null> {
  return chatJson({
    messages,
    temperature: 0.55,
    maxTokens: 900,
    claudeModel: CLAUDE_INTERVIEW_MODEL,
    preferClaude: true,
  });
}

/**
 * Final reports — Claude Sonnet primary.
 */
export async function chatReportJson(messages: ChatMessage[]): Promise<string | null> {
  return chatJson({
    messages,
    temperature: 0.4,
    maxTokens: 4096,
    claudeModel: CLAUDE_REPORT_MODEL,
    preferClaude: true,
  });
}

/**
 * Fast translation / normalization — OpenAI first (cheaper/latency), Claude fallback.
 */
export async function chatNormalizeJson(messages: ChatMessage[]): Promise<string | null> {
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
