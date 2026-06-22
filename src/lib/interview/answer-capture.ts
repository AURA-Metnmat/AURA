import { db } from "@/lib/db";
import type { InteractionType, StructuredAnswerPayload } from "@/lib/aura/interaction";

export interface SaveInterviewAnswerInput {
  sessionId: string;
  messageId: string;
  assistantMessageId?: string | null;
  section?: string | null;
  rawText: string;
  rawTextLocale?: string | null;
  structured?: StructuredAnswerPayload | null;
}

export async function saveInterviewAnswer(input: SaveInterviewAnswerInput): Promise<void> {
  if (!input.structured?.interactionType) return;

  const structuredJson = JSON.stringify({
    interactionType: input.structured.interactionType,
    ...(input.structured.optionId != null ? { optionId: input.structured.optionId } : {}),
    ...(input.structured.value !== undefined ? { value: input.structured.value } : {}),
  });

  await db.interviewAnswer.create({
    data: {
      sessionId: input.sessionId,
      messageId: input.messageId,
      assistantMsgId: input.assistantMessageId ?? null,
      interactionType: input.structured.interactionType,
      rawText: input.rawText,
      rawTextLocale: input.rawTextLocale ?? null,
      structuredJson,
      section: input.section ?? null,
    },
  });
}

export function findLastAssistantMessageId(
  messages: { id: string; role: string; metadata: string | null }[]
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant" && m.metadata?.trim()) {
      return m.id;
    }
  }
  return null;
}

export function isStructuredInteractionType(type: string): type is InteractionType {
  return type === "mcq" || type === "yes_no" || type === "rating" || type === "numeric";
}
