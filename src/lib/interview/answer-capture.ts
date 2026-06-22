import { db } from "@/lib/db";
import type { InteractionType, StructuredAnswerPayload } from "@/lib/aura/interaction";
import { runRefinementPipeline } from "@/lib/refinement/refinement-pipeline";

export interface SaveInterviewAnswerInput {
  sessionId: string;
  messageId: string;
  assistantMessageId?: string | null;
  section?: string | null;
  rawText: string;
  rawTextLocale?: string | null;
  structured?: StructuredAnswerPayload | null;
}

export async function captureUserAnswer(input: SaveInterviewAnswerInput): Promise<string | null> {
  const existing = await db.interviewAnswer.findUnique({
    where: { messageId: input.messageId },
    select: { id: true },
  });
  if (existing) return existing.id;

  const interactionType = input.structured?.interactionType ?? "free_text";
  const structuredJson = input.structured?.interactionType
    ? JSON.stringify({
        interactionType: input.structured.interactionType,
        ...(input.structured.optionId != null ? { optionId: input.structured.optionId } : {}),
        ...(input.structured.value !== undefined ? { value: input.structured.value } : {}),
      })
    : null;

  const answer = await db.interviewAnswer.create({
    data: {
      sessionId: input.sessionId,
      messageId: input.messageId,
      assistantMsgId: input.assistantMessageId ?? null,
      interactionType,
      rawText: input.rawText,
      rawTextLocale: input.rawTextLocale ?? null,
      structuredJson,
      section: input.section ?? null,
    },
  });

  void runRefinementPipeline(answer.id).catch((err) =>
    console.error("[refinement] Pipeline failed:", err)
  );

  return answer.id;
}

/** @deprecated Use captureUserAnswer */
export const saveInterviewAnswer = captureUserAnswer;

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
