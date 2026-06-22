const MAX_USER_MESSAGE_CHARS = 12_000;

/**
 * Bound employee content so it cannot be interpreted as system instructions.
 */
export function wrapUserMessageForLlm(content: string): string {
  const trimmed = content.trim().slice(0, MAX_USER_MESSAGE_CHARS);
  return `[EMPLOYEE_ANSWER_START]\n${trimmed}\n[EMPLOYEE_ANSWER_END]`;
}

export function sanitizeUserInput(content: string): string {
  return content
    .replace(/\0/g, "")
    .replace(/\[EMPLOYEE_ANSWER_(START|END)\]/gi, "")
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
