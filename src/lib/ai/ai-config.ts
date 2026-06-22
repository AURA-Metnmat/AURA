import { hasClaudeProvider, hasOpenAIProvider } from "./providers";

/**
 * When both API keys are set, run collaborative pipelines (Claude draft + OpenAI refine,
 * parallel retrieval merge, etc.). Set AI_DUAL_MODEL=false to use single-model fallback only.
 */
export function isDualModelActive(): boolean {
  if (!hasClaudeProvider() || !hasOpenAIProvider()) return false;
  const flag = process.env.AI_DUAL_MODEL?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return false;
  return true;
}

export const INTERVIEW_REFINE_SYSTEM = `You refine AURA interview assistant JSON drafts.
Return valid JSON only (no markdown). Keep the same schema as the draft: en, locale (if present), interaction (if present).
Rules:
- Preserve facts and intent from the draft; improve clarity, warmth, and question quality.
- Exactly ONE question. Fix broken JSON or interaction widgets.
- Do not add markdown or prose outside JSON.`;

export const REPORT_ENHANCE_SYSTEM = `You enhance an AURA interview report JSON draft.
Return the full JSON object with ALL original keys preserved.
Improve clarity and executive readability in: executiveSummary, recommendations, actionItems.
Do not invent facts not present in the draft. Other fields may be lightly edited for consistency only.`;

export const RETRIEVAL_OPENAI_SYSTEM = `You are a knowledge retrieval engine for AURA interview platform.
Given employee message, interview section, and company knowledge chunks, return JSON:
{"indices":[0,2,5],"summary":"2-3 sentence synthesis of what matters for the next question"}
Pick 0-6 chunk indices most relevant to answer the employee and ask a smart follow-up.
Prefer reference chunks (imported docs, Excel data) for factual/operational questions.
Prefer experience chunks (interview transcripts, pain points, reports) for tacit knowledge and workflows.`;

export function mergeRetrievalIndices(
  primary: number[],
  secondary: number[],
  maxChunks: number
): number[] {
  const seen = new Set<number>();
  const merged: number[] = [];

  const add = (idx: number) => {
    if (idx < 0 || seen.has(idx)) return;
    seen.add(idx);
    merged.push(idx);
  };

  const maxLen = Math.max(primary.length, secondary.length);
  for (let i = 0; i < maxLen && merged.length < maxChunks; i++) {
    if (i < primary.length) add(primary[i]!);
    if (merged.length < maxChunks && i < secondary.length) add(secondary[i]!);
  }

  for (const idx of [...primary, ...secondary]) {
    if (merged.length >= maxChunks) break;
    add(idx);
  }

  return merged.slice(0, maxChunks);
}

export function mergeReportFields(
  base: Record<string, string>,
  enhanced: Record<string, string>
): Record<string, string> {
  const keys = new Set([...Object.keys(base), ...Object.keys(enhanced)]);
  const out: Record<string, string> = { ...base };
  for (const key of keys) {
    const enhancedVal = enhanced[key]?.trim();
    if (!enhancedVal) continue;
    if (key === "executiveSummary" || key === "recommendations" || key === "actionItems") {
      out[key] = enhancedVal;
    } else if (!out[key]?.trim()) {
      out[key] = enhancedVal;
    }
  }
  return out;
}
