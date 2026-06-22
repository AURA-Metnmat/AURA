import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";
import {
  isReviewStatus,
  isTopicCategory,
  parseChunkMetadata,
  REVIEW_STATUS,
} from "@/lib/knowledge/review";
import { SOURCE_TYPE } from "@/lib/knowledge/indexer";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; chunkId: string }> }
) {
  const { id, chunkId } = await params;
  const session = await requireCompanyAdmin(request, id, PERMISSIONS.REVIEW_KNOWLEDGE);
  if (session instanceof NextResponse) return session;

  try {
    const company = await db.company.findUnique({ where: { id }, select: { slug: true } });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const chunk = await db.knowledgeChunk.findFirst({
      where: { id: chunkId, companySlug: company.slug, sourceType: SOURCE_TYPE.EXPERIENCE },
    });
    if (!chunk) {
      return NextResponse.json({ error: "Experience record not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      reviewStatus?: string;
      topicCategory?: string;
      reviewNotes?: string;
    };

    const data: {
      reviewStatus?: string;
      topicCategory?: string;
      reviewNotes?: string | null;
      reviewedAt?: Date | null;
      reviewedBy?: string | null;
    } = {};

    if (body.reviewStatus !== undefined) {
      if (!isReviewStatus(body.reviewStatus)) {
        return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
      }
      data.reviewStatus = body.reviewStatus;
      data.reviewedAt = new Date();
      data.reviewedBy = "admin";
    }

    if (body.topicCategory !== undefined) {
      if (body.topicCategory && !isTopicCategory(body.topicCategory)) {
        return NextResponse.json({ error: "Invalid topic category" }, { status: 400 });
      }
      data.topicCategory = body.topicCategory || "other";
    }

    if (body.reviewNotes !== undefined) {
      data.reviewNotes = body.reviewNotes.trim() || null;
    }

    const updated = await db.knowledgeChunk.update({
      where: { id: chunkId },
      data,
    });

    const meta = parseChunkMetadata(updated.metadata);

    await logAdminAudit({
      action: AUDIT_ACTIONS.KNOWLEDGE_REVIEW,
      request,
      session,
      companyId: id,
      resourceType: "knowledge_chunk",
      resourceId: chunkId,
      metadata: { reviewStatus: updated.reviewStatus, topicCategory: updated.topicCategory },
    });

    return NextResponse.json({
      id: updated.id,
      reviewStatus: updated.reviewStatus,
      topicCategory: updated.topicCategory,
      reviewNotes: updated.reviewNotes,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      reviewedBy: updated.reviewedBy,
      sessionId: typeof meta.sessionId === "string" ? meta.sessionId : null,
    });
  } catch (error) {
    console.error("Chunk review PATCH error:", error);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; chunkId: string }> }
) {
  const { id, chunkId } = await params;
  const session = await requireCompanyAdmin(request, id, PERMISSIONS.REVIEW_KNOWLEDGE);
  if (session instanceof NextResponse) return session;

  try {
    const company = await db.company.findUnique({ where: { id }, select: { slug: true } });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = (await request.json()) as { action?: string };
    if (body.action !== "validate") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    const updated = await db.knowledgeChunk.updateMany({
      where: {
        id: chunkId,
        companySlug: company.slug,
        sourceType: SOURCE_TYPE.EXPERIENCE,
      },
      data: {
        reviewStatus: REVIEW_STATUS.VALIDATED,
        reviewedAt: new Date(),
        reviewedBy: "admin",
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Experience record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, reviewStatus: REVIEW_STATUS.VALIDATED });
  } catch (error) {
    console.error("Chunk quick-validate error:", error);
    return NextResponse.json({ error: "Failed to validate" }, { status: 500 });
  }
}
