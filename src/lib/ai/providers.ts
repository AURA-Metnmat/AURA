import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { env } from "@/lib/env";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

let anthropicClient: Anthropic | null | undefined;
let openaiClient: OpenAI | null | undefined;

export function getAnthropicClient(): Anthropic | null {
  if (anthropicClient !== undefined) return anthropicClient;
  const key = env().anthropicApiKey;
  anthropicClient = key ? new Anthropic({ apiKey: key }) : null;
  return anthropicClient;
}

export function getOpenAIClient(): OpenAI | null {
  if (openaiClient !== undefined) return openaiClient;
  try {
    openaiClient = new OpenAI({ apiKey: env().openaiApiKey });
    return openaiClient;
  } catch {
    openaiClient = null;
    return null;
  }
}

export function hasClaudeProvider(): boolean {
  return getAnthropicClient() !== null;
}

export function hasOpenAIProvider(): boolean {
  return getOpenAIClient() !== null;
}

export function splitSystemMessages(messages: ChatMessage[]): {
  system: string;
  conversation: ChatMessage[];
} {
  const systemParts: string[] = [];
  const conversation: ChatMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemParts.push(msg.content);
    } else {
      conversation.push(msg);
    }
  }

  return {
    system: systemParts.join("\n\n"),
    conversation,
  };
}
