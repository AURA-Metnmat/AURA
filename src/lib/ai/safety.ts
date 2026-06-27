const MAX_USER_MESSAGE_CHARS = 12_000;

/**
 * Bound employee content so it cannot be interpreted as system instructions.
 */
export function wrapUserMessageForLlm(content: string): string {
  const trimmed = content.trim().slice(0, MAX_USER_MESSAGE_CHARS);
  return `[EMPLOYEE_ANSWER_START]\n${trimmed}\n[EMPLOYEE_ANSWER_END]`;
}

/**
 * Fence untrusted reference content (RAG chunks, uploaded document text) that is
 * injected into the system prompt. Strips any fence markers the source may have
 * embedded, so a poisoned document cannot break out of the fence. The system
 * prompt instructs the model never to follow instructions inside this block.
 */
export function wrapUntrustedReference(content: string): string {
  const cleaned = content
    .replace(/\0/g, "")
    .replace(/\[(?:EMPLOYEE_ANSWER|REFERENCE_DATA)_(?:START|END)\]/gi, "")
    .trim();
  return `[REFERENCE_DATA_START]\n${cleaned}\n[REFERENCE_DATA_END]`;
}

export function sanitizeUserInput(content: string): string {
  return content
    .replace(/\0/g, "")
    .replace(/\[(?:EMPLOYEE_ANSWER|REFERENCE_DATA)_(?:START|END)\]/gi, "")
    .trim()
    .slice(0, MAX_USER_MESSAGE_CHARS);
}

export function containsPromptInjectionSignals(content: string): boolean {
  const lower = content.toLowerCase();
  const patterns = [
    "ignore previous instructions",
    "ignore all instructions",
    "you are now",
    "system prompt",
    "reveal your instructions",
    "disregard the above",
    "jailbreak",
  ];
  return patterns.some((p) => lower.includes(p));
}
