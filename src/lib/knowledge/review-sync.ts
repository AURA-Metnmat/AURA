import { db } from "@/lib/db";
import { isReviewStatus, REVIEW_STATUS, type ReviewStatus } from "./review";

export const INTERVIEW_ANSWER_SOURCE_KIND = "interview_answer" as const;

export interface ReviewSyncFields {
  reviewStatus: ReviewStatus;
  reviewNotes?: string | null;
  reviewedAt?: Date | null;
}

export function isInterviewAnswerChunk(
  sourceKind: string,
  sourceId: string | null | undefined
): sourceId is string {
  return sourceKind === INTERVIEW_ANSWER_SOURCE_KIND && Boolean(sourceId);
}

/** Propagate InterviewAnswer review state to indexed knowledge chunks. */
export async function syncInterviewAnswerReviewToChunks(
  params: { answerId: string; companySlug: string } & ReviewSyncFields
): Promise<number> {
  const { answerId, companySlug, reviewStatus, reviewNotes, reviewedAt } = params;

  if (reviewStatus === REVIEW_STATUS.REJECTED) {
    const deleted = await db.knowledgeChunk.deleteMany({
      where: {
        companySlug,
        sourceKind: INTERVIEW_ANSWER_SOURCE_KIND,
        sourceId: answerId,
      },
    });
    return deleted.count;
  }

  const updated = await db.knowledgeChunk.updateMany({
    where: {
      companySlug,
      sourceKind: INTERVIEW_ANSWER_SOURCE_KIND,
      sourceId: answerId,
    },
    data: {
      reviewStatus,
      ...(reviewNotes !== undefined ? { reviewNotes } : {}),
      reviewedAt: reviewedAt ?? new Date(),
      reviewedBy: "answer_sync",
    },
  });
  return updated.count;
}

/** Propagate KnowledgeChunk review state back to the source InterviewAnswer. */
export async function syncKnowledgeChunkReviewToInterviewAnswer(chunk: {
  sourceKind: string;
  sourceId: string | null;
  reviewStatus: string | null;
  reviewNotes?: string | null;
  reviewedAt?: Date | null;
}): Promise<boolean> {
  if (!isInterviewAnswerChunk(chunk.sourceKind, chunk.sourceId)) {
    return false;
  }

  const status = chunk.reviewStatus;
  if (!status || !isReviewStatus(status)) {
    return false;
  }

  await db.interviewAnswer.update({
    where: { id: chunk.sourceId },
    data: {
      reviewStatus: status,
      ...(chunk.reviewNotes !== undefined ? { reviewNotes: chunk.reviewNotes } : {}),
      reviewedAt: chunk.reviewedAt ?? new Date(),
    },
  });
  return true;
}
