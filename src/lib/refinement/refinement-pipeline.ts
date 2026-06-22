import { REVIEW_STATUS, type ReviewStatus } from "@/lib/knowledge/review";
import { db } from "@/lib/db";
import { syncInterviewAnswerReviewToChunks } from "@/lib/knowledge/review-sync";

export interface AnswerForRefinement {
  id: string;
  rawText: string;
  interactionType: string;
  structuredJson: string | null;
  section: string | null;
  createdAt: Date;
}

export interface ContradictionFlag {
  type: "opposite_yes_no" | "numeric_mismatch" | "duplicate";
  relatedAnswerId: string;
  detail: string;
}

export interface RefinementResult {
  qualityScore: number;
  confidenceScore: number;
  reviewStatus: ReviewStatus;
  duplicateOfId: string | null;
  contradictionFlags: ContradictionFlag[];
}

const GENERIC_ANSWERS = new Set([
  "yes",
  "no",
  "ok",
  "okay",
  "sure",
  "maybe",
  "n/a",
  "na",
  "none",
  "idk",
  "हाँ",
  "हां",
  "नहीं",
  "ठीक",
]);

export function normalizeAnswerText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenSet(text: string): Set<string> {
  return new Set(
    normalizeAnswerText(text)
      .split(" ")
      .filter((w) => w.length > 2)
  );
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function parseStructuredValue(
  structuredJson: string | null
): { value?: string | number | boolean; optionId?: string } | null {
  if (!structuredJson?.trim()) return null;
  try {
    return JSON.parse(structuredJson) as {
      value?: string | number | boolean;
      optionId?: string;
    };
  } catch {
    return null;
  }
}

export function computeQualityScore(answer: AnswerForRefinement): number {
  const text = answer.rawText.trim();
  const normalized = normalizeAnswerText(text);
  const words = normalized.split(" ").filter(Boolean);
  const structured = parseStructuredValue(answer.structuredJson);

  if (!text) return 0.1;

  if (GENERIC_ANSWERS.has(normalized)) {
    return 0.35;
  }

  let score = 0.25;

  if (answer.interactionType !== "free_text") {
    score = 0.65;
    if (structured?.optionId) score += 0.15;
    if (structured?.value !== undefined) score += 0.1;
  }

  const wordScore = Math.min(0.35, words.length / 20);
  score += wordScore;

  if (/\d/.test(text)) score += 0.08;
  if (words.length >= 8) score += 0.07;

  if (words.length < 3 && answer.interactionType === "free_text") {
    score = Math.min(score, 0.4);
  }

  return Math.min(1, Math.round(score * 100) / 100);
}

export function findDuplicateAnswerId(
  answer: AnswerForRefinement,
  priorAnswers: AnswerForRefinement[]
): string | null {
  for (const prior of priorAnswers) {
    if (prior.id === answer.id) continue;
    const similarity = jaccardSimilarity(answer.rawText, prior.rawText);
    if (similarity >= 0.88) {
      return prior.id;
    }
  }
  return null;
}

function isYesValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.toLowerCase();
    if (v === "yes" || v === "true") return true;
    if (v === "no" || v === "false") return false;
  }
  return null;
}

export function detectContradictions(
  answer: AnswerForRefinement,
  priorAnswers: AnswerForRefinement[]
): ContradictionFlag[] {
  const flags: ContradictionFlag[] = [];
  const current = parseStructuredValue(answer.structuredJson);

  for (const prior of priorAnswers) {
    if (prior.id === answer.id) continue;

    if (answer.section && prior.section === answer.section) {
      const similarity = jaccardSimilarity(answer.rawText, prior.rawText);
      if (similarity >= 0.88 && answer.id !== prior.id) {
        flags.push({
          type: "duplicate",
          relatedAnswerId: prior.id,
          detail: "Very similar answer in the same section",
        });
      }
    }

    if (
      answer.interactionType === "yes_no" &&
      prior.interactionType === "yes_no" &&
      answer.section &&
      prior.section === answer.section
    ) {
      const priorVal = parseStructuredValue(prior.structuredJson);
      const curBool = isYesValue(current?.value);
      const priorBool = isYesValue(priorVal?.value);
      if (curBool !== null && priorBool !== null && curBool !== priorBool) {
        flags.push({
          type: "opposite_yes_no",
          relatedAnswerId: prior.id,
          detail: `Conflicting yes/no in section ${answer.section}`,
        });
      }
    }

    if (
      answer.interactionType === "numeric" &&
      prior.interactionType === "numeric" &&
      answer.section &&
      prior.section === answer.section
    ) {
      const curNum = Number(current?.value);
      const priorNum = Number(parseStructuredValue(prior.structuredJson)?.value);
      if (
        !Number.isNaN(curNum) &&
        !Number.isNaN(priorNum) &&
        priorNum !== 0 &&
        Math.abs(curNum - priorNum) / Math.abs(priorNum) > 0.5
      ) {
        flags.push({
          type: "numeric_mismatch",
          relatedAnswerId: prior.id,
          detail: `Numeric answers differ significantly in section ${answer.section}`,
        });
      }
    }
  }

  return flags;
}

export function computeConfidenceScore(
  qualityScore: number,
  duplicateOfId: string | null,
  contradictions: ContradictionFlag[]
): number {
  let confidence = qualityScore;
  if (duplicateOfId) confidence *= 0.45;
  if (contradictions.length > 0) confidence *= 0.55;
  return Math.min(1, Math.round(confidence * 100) / 100);
}

export function deriveReviewStatus(
  confidenceScore: number,
  duplicateOfId: string | null,
  contradictions: ContradictionFlag[]
): ReviewStatus {
  if (duplicateOfId || contradictions.length > 0) {
    return REVIEW_STATUS.NEEDS_ATTENTION;
  }
  if (confidenceScore < 0.35) {
    return REVIEW_STATUS.NEEDS_ATTENTION;
  }
  return REVIEW_STATUS.PENDING;
}

export function refineAnswer(
  answer: AnswerForRefinement,
  priorAnswers: AnswerForRefinement[]
): RefinementResult {
  const qualityScore = computeQualityScore(answer);
  const duplicateOfId = findDuplicateAnswerId(answer, priorAnswers);
  const contradictionFlags = detectContradictions(answer, priorAnswers);
  const confidenceScore = computeConfidenceScore(
    qualityScore,
    duplicateOfId,
    contradictionFlags
  );
  const reviewStatus = deriveReviewStatus(confidenceScore, duplicateOfId, contradictionFlags);

  return {
    qualityScore,
    confidenceScore,
    reviewStatus,
    duplicateOfId,
    contradictionFlags,
  };
}

export async function runRefinementPipeline(answerId: string): Promise<void> {
  const answer = await db.interviewAnswer.findUnique({
    where: { id: answerId },
    include: {
      session: {
        include: {
          answers: { orderBy: { createdAt: "asc" } },
          company: { select: { slug: true } },
        },
      },
    },
  });

  if (!answer) return;

  const priorAnswers = answer.session.answers.filter((a) => a.id !== answer.id);
  const result = refineAnswer(answer, priorAnswers);

  await db.interviewAnswer.update({
    where: { id: answerId },
    data: {
      qualityScore: result.qualityScore,
      confidenceScore: result.confidenceScore,
      reviewStatus: result.reviewStatus,
      duplicateOfId: result.duplicateOfId,
      contradictionFlags:
        result.contradictionFlags.length > 0
          ? JSON.stringify(result.contradictionFlags)
          : null,
      refinedAt: new Date(),
    },
  });

  const companySlug = answer.session.company.slug;
  if (companySlug) {
    await syncInterviewAnswerReviewToChunks({
      answerId,
      companySlug,
      reviewStatus: result.reviewStatus,
      reviewedAt: new Date(),
    });
  }
}
