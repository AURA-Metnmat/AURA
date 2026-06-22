import { db } from "@/lib/db";
import { isReviewStatus, REVIEW_STATUS, type ReviewStatus } from "@/lib/knowledge/review";
import { parseConfidenceFilter } from "@/lib/refinement/quality-stats";

export interface AnswerExportFilters {
  employeeId?: string | null;
  sessionId?: string | null;
  department?: string | null;
  campaignId?: string | null;
  status?: string | null;
  confidenceMin?: string | null;
  confidenceMax?: string | null;
  limit?: number;
}

export interface AnswerExportRecord {
  answerId: string;
  sessionId: string;
  employeeId: string | null;
  employeeCode: string | null;
  participantName: string | null;
  department: string | null;
  designation: string | null;
  section: string | null;
  interactionType: string;
  questionEn: string | null;
  questionLocale: string | null;
  answerEn: string;
  answerLocale: string | null;
  structuredJson: unknown | null;
  qualityScore: number | null;
  confidenceScore: number | null;
  reviewStatus: ReviewStatus;
  contradictionFlags: unknown[];
  campaignId: string | null;
  campaignName: string | null;
  createdAt: string;
}

function buildWhere(companyId: string, filters: AnswerExportFilters) {
  const confidenceFilter = parseConfidenceFilter(
    filters.confidenceMin ?? null,
    filters.confidenceMax ?? null
  );

  return {
    session: {
      companyId,
      ...(filters.sessionId ? { id: filters.sessionId } : {}),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
      ...(filters.department
        ? {
            participant: {
              department: { equals: filters.department, mode: "insensitive" as const },
            },
          }
        : {}),
    },
    ...(filters.status && isReviewStatus(filters.status)
      ? { reviewStatus: filters.status }
      : {}),
    ...(confidenceFilter ? { confidenceScore: confidenceFilter } : {}),
  };
}

export async function fetchAnswersForExport(
  companyId: string,
  filters: AnswerExportFilters
): Promise<AnswerExportRecord[]> {
  const limit = Math.min(filters.limit ?? 5000, 10000);
  const answers = await db.interviewAnswer.findMany({
    where: buildWhere(companyId, filters),
    orderBy: [{ sessionId: "asc" }, { createdAt: "asc" }],
    take: limit,
    include: {
      session: {
        select: {
          id: true,
          employeeId: true,
          campaignId: true,
          campaign: { select: { name: true } },
          employee: { select: { id: true, employeeCode: true } },
          participant: {
            select: {
              fullName: true,
              department: true,
              designation: true,
              employeeId: true,
            },
          },
        },
      },
    },
  });

  const assistantIds = answers
    .map((a) => a.assistantMsgId)
    .filter((id): id is string => Boolean(id));

  const assistantMessages =
    assistantIds.length > 0
      ? await db.message.findMany({
          where: { id: { in: assistantIds } },
          select: { id: true, content: true, contentLocale: true },
        })
      : [];

  const assistantById = new Map(assistantMessages.map((m) => [m.id, m]));

  return answers.map((a) => {
    const reviewStatus: ReviewStatus =
      a.reviewStatus && isReviewStatus(a.reviewStatus)
        ? a.reviewStatus
        : REVIEW_STATUS.PENDING;
    const assistant = a.assistantMsgId ? assistantById.get(a.assistantMsgId) : null;

    return {
      answerId: a.id,
      sessionId: a.sessionId,
      employeeId: a.session.employeeId ?? a.session.employee?.id ?? null,
      employeeCode:
        a.session.participant?.employeeId ?? a.session.employee?.employeeCode ?? null,
      participantName: a.session.participant?.fullName ?? null,
      department: a.session.participant?.department ?? null,
      designation: a.session.participant?.designation ?? null,
      section: a.section,
      interactionType: a.interactionType,
      questionEn: assistant?.content ?? null,
      questionLocale: assistant?.contentLocale ?? null,
      answerEn: a.rawText,
      answerLocale: a.rawTextLocale,
      structuredJson: a.structuredJson ? JSON.parse(a.structuredJson) : null,
      qualityScore: a.qualityScore,
      confidenceScore: a.confidenceScore,
      reviewStatus,
      contradictionFlags: a.contradictionFlags
        ? (JSON.parse(a.contradictionFlags) as unknown[])
        : [],
      campaignId: a.session.campaignId,
      campaignName: a.session.campaign?.name ?? null,
      createdAt: a.createdAt.toISOString(),
    };
  });
}

export function buildAnswerExportJsonl(records: AnswerExportRecord[]): string {
  return records.map((r) => JSON.stringify(r)).join("\n");
}
