import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { isReviewStatus, REVIEW_STATUS } from "@/lib/knowledge/review";
import { syncInterviewAnswerReviewToChunks } from "@/lib/knowledge/review-sync";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; answerId: string }> }
) {
  const { id: companyId, answerId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.REVIEW_ANSWERS);
  if (session instanceof NextResponse) return session;
  const body = (await request.json()) as {
    reviewStatus?: string;
    reviewNotes?: string | null;
  };

  const answer = await db.interviewAnswer.findFirst({
    where: { id: answerId, session: { companyId } },
    include: { session: { select: { company: { select: { slug: true } } } } },
  });

  if (!answer) {
    return NextResponse.json({ error: "Answer not found" }, { status: 404 });
  }

  const data: {
    reviewStatus?: string;
    reviewNotes?: string | null;
    reviewedAt?: Date;
  } = {};

  if (body.reviewStatus !== undefined) {
    if (!isReviewStatus(body.reviewStatus)) {
      return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
    }
    data.reviewStatus = body.reviewStatus;
    data.reviewedAt = new Date();
  }

  if (body.reviewNotes !== undefined) {
    data.reviewNotes = body.reviewNotes?.trim() || null;
  }

  const updated = await db.interviewAnswer.update({
    where: { id: answerId },
    data,
  });

  const companySlug = answer.session.company.slug;
  if (
    companySlug &&
    (body.reviewStatus !== undefined || body.reviewNotes !== undefined)
  ) {
    const reviewStatus = updated.reviewStatus;
    if (reviewStatus && isReviewStatus(reviewStatus)) {
      await syncInterviewAnswerReviewToChunks({
        answerId,
        companySlug,
        reviewStatus,
        reviewNotes: updated.reviewNotes,
        reviewedAt: updated.reviewedAt,
      });
    }
  }

  await logAdminAudit({
    action: AUDIT_ACTIONS.ANSWER_REVIEW,
    request,
    session,
    companyId,
    resourceType: "interview_answer",
    resourceId: answerId,
    metadata: { reviewStatus: updated.reviewStatus },
  });

  return NextResponse.json({
    id: updated.id,
    reviewStatus: updated.reviewStatus ?? REVIEW_STATUS.PENDING,
    reviewNotes: updated.reviewNotes,
    reviewedAt: updated.reviewedAt?.toISOString() ?? null,
  });
}
