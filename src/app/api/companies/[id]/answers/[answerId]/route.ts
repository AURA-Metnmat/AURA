import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { isReviewStatus, REVIEW_STATUS } from "@/lib/knowledge/review";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; answerId: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id: companyId, answerId } = await params;
  const body = (await request.json()) as {
    reviewStatus?: string;
    reviewNotes?: string | null;
  };

  const answer = await db.interviewAnswer.findFirst({
    where: { id: answerId, session: { companyId } },
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

  return NextResponse.json({
    id: updated.id,
    reviewStatus: updated.reviewStatus ?? REVIEW_STATUS.PENDING,
    reviewNotes: updated.reviewNotes,
    reviewedAt: updated.reviewedAt?.toISOString() ?? null,
  });
}
