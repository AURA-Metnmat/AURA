import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import {
  isReviewStatus,
  REVIEW_STATUS,
  REVIEW_STATUS_LABELS,
  type ReviewStatus,
} from "@/lib/knowledge/review";
import { parseConfidenceFilter } from "@/lib/refinement/quality-stats";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.REVIEW_ANSWERS);
  if (session instanceof NextResponse) return session;

  const company = await db.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const departmentParam = searchParams.get("department");
  const campaignParam = searchParams.get("campaignId");
  const employeeIdParam = searchParams.get("employeeId");
  const confidenceMin = searchParams.get("confidenceMin");
  const confidenceMax = searchParams.get("confidenceMax");
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);

  const confidenceFilter = parseConfidenceFilter(confidenceMin, confidenceMax);

  const answers = await db.interviewAnswer.findMany({
    where: {
      session: {
        companyId,
        ...(campaignParam ? { campaignId: campaignParam } : {}),
        ...(employeeIdParam ? { employeeId: employeeIdParam } : {}),
        ...(departmentParam
          ? {
              participant: {
                department: { equals: departmentParam, mode: "insensitive" },
              },
            }
          : {}),
      },
      ...(statusParam && isReviewStatus(statusParam) ? { reviewStatus: statusParam } : {}),
      ...(confidenceFilter ? { confidenceScore: confidenceFilter } : {}),
    },
    orderBy: [{ reviewStatus: "asc" }, { confidenceScore: "asc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      session: {
        select: {
          id: true,
          campaignId: true,
          campaign: { select: { id: true, name: true } },
          participant: {
            select: {
              fullName: true,
              department: true,
              designation: true,
              employeeId: true,
            },
          },
          employeeId: true,
        },
      },
    },
  });

  return NextResponse.json({
    answers: answers.map((a) => {
      const reviewStatus: ReviewStatus =
        a.reviewStatus && isReviewStatus(a.reviewStatus)
          ? a.reviewStatus
          : REVIEW_STATUS.PENDING;

      return {
      id: a.id,
      sessionId: a.sessionId,
      interactionType: a.interactionType,
      rawText: a.rawText,
      section: a.section,
      qualityScore: a.qualityScore,
      confidenceScore: a.confidenceScore,
      reviewStatus,
      reviewStatusLabel: REVIEW_STATUS_LABELS[reviewStatus],
      duplicateOfId: a.duplicateOfId,
      contradictionFlags: a.contradictionFlags
        ? (JSON.parse(a.contradictionFlags) as unknown[])
        : [],
      reviewNotes: a.reviewNotes,
      reviewedAt: a.reviewedAt?.toISOString() ?? null,
      refinedAt: a.refinedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      employeeId: a.session.employeeId,
      employeeCode: a.session.participant?.employeeId ?? null,
      participant: a.session.participant?.fullName ?? null,
      department: a.session.participant?.department ?? null,
      designation: a.session.participant?.designation ?? null,
      campaignId: a.session.campaignId,
      campaignName: a.session.campaign?.name ?? null,
    };
    }),
  });
}
