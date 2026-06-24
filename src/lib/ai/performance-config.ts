/**
 * Interview latency controls. Fast mode is ON by default — set AI_INTERVIEW_FAST=false for max quality.
 */
export function isInterviewFastMode(): boolean {
  const flag = process.env.AI_INTERVIEW_FAST?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return false;
  return true;
}

/** LLM-based RAG ranking (2 API calls in dual mode). Off in fast mode — uses keyword heuristic. */
export function isRetrievalLlmEnabled(): boolean {
  if (isInterviewFastMode()) return false;
  const flag = process.env.AI_RETRIEVAL_LLM?.trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "on";
}

/** Second-pass OpenAI refine after Claude draft on each interview turn. */
export function isInterviewDualRefineEnabled(): boolean {
  if (isInterviewFastMode()) return false;
  const flag = process.env.AI_INTERVIEW_DUAL_REFINE?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return false;
  return true;
}

/** Second-pass Claude polish on bilingual user messages. */
export function isNormalizeDualPolishEnabled(): boolean {
  if (isInterviewFastMode()) return false;
  const flag = process.env.AI_NORMALIZE_DUAL?.trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "on";
}

/** Dual-model report enhancement on interview complete. */
export function isReportDualEnhanceEnabled(): boolean {
  if (isInterviewFastMode()) return false;
  const flag = process.env.AI_REPORT_DUAL?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return false;
  return true;
}

export function getInterviewMaxTokens(): number {
  if (isInterviewFastMode()) return 650;
  return 900;
}
