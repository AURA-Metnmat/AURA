import { db } from "@/lib/db";
import { REVIEW_STATUS, isReviewStatus } from "@/lib/knowledge/review";

export interface QualityKpis {
  totalAnswers: number;
  avgQualityScore: number | null;
  avgConfidenceScore: number | null;
  dataQualityScore: number | null;
  review: {
    pending: number;
    validated: number;
    needsAttention: number;
    rejected: number;
  };
  lowConfidenceCount: number;
  duplicateCount: number;
  contradictionCount: number;
  byDepartment: { department: string; count: number; avgConfidence: number | null }[];
  byCampaign: { campaignId: string; campaignName: string; count: number; avgConfidence: number | null }[];
}

export async function getCompanyQualityKpis(companyId: string): Promise<QualityKpis> {
  const answers = await db.interviewAnswer.findMany({
    where: { session: { companyId } },
    select: {
      id: true,
      qualityScore: true,
      confidenceScore: true,
      reviewStatus: true,
      duplicateOfId: true,
      contradictionFlags: true,
      session: {
        select: {
          campaignId: true,
          campaign: { select: { id: true, name: true } },
          participant: { select: { department: true } },
        },
      },
    },
  });

  const review = {
    pending: 0,
    validated: 0,
    needsAttention: 0,
    rejected: 0,
  };

  let qualitySum = 0;
  let qualityCount = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;
  let lowConfidenceCount = 0;
  let duplicateCount = 0;
  let contradictionCount = 0;

  const deptMap = new Map<string, { count: number; confSum: number; confN: number }>();
  const campaignMap = new Map<
    string,
    { name: string; count: number; confSum: number; confN: number }
  >();

  for (const a of answers) {
    const status = a.reviewStatus ?? REVIEW_STATUS.PENDING;
    if (status === REVIEW_STATUS.PENDING) review.pending += 1;
    else if (status === REVIEW_STATUS.VALIDATED) review.validated += 1;
    else if (status === REVIEW_STATUS.NEEDS_ATTENTION) review.needsAttention += 1;
    else if (status === REVIEW_STATUS.REJECTED) review.rejected += 1;

    if (a.qualityScore != null) {
      qualitySum += a.qualityScore;
      qualityCount += 1;
    }
    if (a.confidenceScore != null) {
      confidenceSum += a.confidenceScore;
      confidenceCount += 1;
      if (a.confidenceScore < 0.5) lowConfidenceCount += 1;
    }
    if (a.duplicateOfId) duplicateCount += 1;
    if (a.contradictionFlags?.trim()) contradictionCount += 1;

    const dept = a.session.participant?.department?.trim() || "Unknown";
    const deptEntry = deptMap.get(dept) ?? { count: 0, confSum: 0, confN: 0 };
    deptEntry.count += 1;
    if (a.confidenceScore != null) {
      deptEntry.confSum += a.confidenceScore;
      deptEntry.confN += 1;
    }
    deptMap.set(dept, deptEntry);

    const campId = a.session.campaignId ?? "none";
    const campName = a.session.campaign?.name ?? "No campaign";
    const campEntry = campaignMap.get(campId) ?? {
      name: campName,
      count: 0,
      confSum: 0,
      confN: 0,
    };
    campEntry.count += 1;
    if (a.confidenceScore != null) {
      campEntry.confSum += a.confidenceScore;
      campEntry.confN += 1;
    }
    campaignMap.set(campId, campEntry);
  }

  const avgQualityScore = qualityCount > 0 ? qualitySum / qualityCount : null;
  const avgConfidenceScore = confidenceCount > 0 ? confidenceSum / confidenceCount : null;

  const validatedRatio =
    answers.length > 0 ? review.validated / answers.length : 0;
  const confidenceComponent = avgConfidenceScore ?? 0;
  const dataQualityScore =
    answers.length > 0
      ? Math.round(
          (confidenceComponent * 0.6 + validatedRatio * 0.4) * 100
        ) / 100
      : null;

  return {
    totalAnswers: answers.length,
    avgQualityScore:
      avgQualityScore != null ? Math.round(avgQualityScore * 100) / 100 : null,
    avgConfidenceScore:
      avgConfidenceScore != null ? Math.round(avgConfidenceScore * 100) / 100 : null,
    dataQualityScore,
    review,
    lowConfidenceCount,
    duplicateCount,
    contradictionCount,
    byDepartment: [...deptMap.entries()].map(([department, v]) => ({
      department,
      count: v.count,
      avgConfidence: v.confN > 0 ? Math.round((v.confSum / v.confN) * 100) / 100 : null,
    })),
    byCampaign: [...campaignMap.entries()].map(([campaignId, v]) => ({
      campaignId,
      campaignName: v.name,
      count: v.count,
      avgConfidence: v.confN > 0 ? Math.round((v.confSum / v.confN) * 100) / 100 : null,
    })),
  };
}

export function parseConfidenceFilter(
  min?: string | null,
  max?: string | null
): { gte?: number; lte?: number } | undefined {
  const gte = min != null && min !== "" ? Number(min) : undefined;
  const lte = max != null && max !== "" ? Number(max) : undefined;
  if (gte === undefined && lte === undefined) return undefined;
  return {
    ...(gte !== undefined && !Number.isNaN(gte) ? { gte } : {}),
    ...(lte !== undefined && !Number.isNaN(lte) ? { lte } : {}),
  };
}

export function isValidReviewStatusFilter(value: string | null): value is string {
  return !!value && isReviewStatus(value);
}
