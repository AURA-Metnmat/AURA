import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { getKnowledgeStats, SOURCE_TYPE } from "@/lib/knowledge/indexer";
import {
  isReviewStatus,
  isTopicCategory,
  parseChunkMetadata,
  REVIEW_STATUS,
} from "@/lib/knowledge/review";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireCompanyAdmin(request, id, PERMISSIONS.REVIEW_KNOWLEDGE);
  if (session instanceof NextResponse) return session;

  try {
    const company = await db.company.findUnique({ where: { id }, select: { slug: true } });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const listExperience = searchParams.get("list") === "experience";
    const statusParam = searchParams.get("status");
    const categoryParam = searchParams.get("category");
    const previewLimit = Math.min(Number(searchParams.get("preview") ?? 15), 50);
    const listLimit = Math.min(Number(searchParams.get("limit") ?? 100), 500);

    const experienceWhere: {
      companySlug: string;
      sourceType: string;
      reviewStatus?: string;
      topicCategory?: string;
    } = {
      companySlug: company.slug,
      sourceType: SOURCE_TYPE.EXPERIENCE,
    };

    if (statusParam && isReviewStatus(statusParam)) {
      experienceWhere.reviewStatus = statusParam;
    }
    if (categoryParam && isTopicCategory(categoryParam)) {
      experienceWhere.topicCategory = categoryParam;
    }

    const [stats, referencePreview, experiencePreview, experienceList] = await Promise.all([
      getKnowledgeStats(company.slug),
      db.knowledgeChunk.findMany({
        where: { companySlug: company.slug, sourceType: SOURCE_TYPE.REFERENCE },
        orderBy: { updatedAt: "desc" },
        take: previewLimit,
        select: {
          id: true,
          sourceKind: true,
          sourceLabel: true,
          content: true,
          charCount: true,
          updatedAt: true,
        },
      }),
      listExperience
        ? Promise.resolve([])
        : db.knowledgeChunk.findMany({
            where: experienceWhere,
            orderBy: { updatedAt: "desc" },
            take: previewLimit,
            select: {
              id: true,
              sourceKind: true,
              sourceLabel: true,
              content: true,
              charCount: true,
              updatedAt: true,
              reviewStatus: true,
              topicCategory: true,
              reviewNotes: true,
              metadata: true,
            },
          }),
      listExperience
        ? db.knowledgeChunk.findMany({
            where: experienceWhere,
            orderBy: [{ reviewStatus: "asc" }, { updatedAt: "desc" }],
            take: listLimit,
            select: {
              id: true,
              sourceKind: true,
              sourceLabel: true,
              content: true,
              charCount: true,
              updatedAt: true,
              reviewStatus: true,
              topicCategory: true,
              reviewNotes: true,
              reviewedAt: true,
              reviewedBy: true,
              metadata: true,
            },
          })
        : Promise.resolve([]),
    ]);

    function mapExperienceChunk(c: {
      id: string;
      sourceKind: string;
      sourceLabel: string;
      content: string;
      charCount: number;
      updatedAt: Date;
      reviewStatus: string | null;
      topicCategory: string | null;
      reviewNotes: string | null;
      reviewedAt?: Date | null;
      reviewedBy?: string | null;
      metadata: string | null;
    }) {
      const meta = parseChunkMetadata(c.metadata);
      return {
        id: c.id,
        sourceKind: c.sourceKind,
        sourceLabel: c.sourceLabel,
        content: c.content,
        preview: c.content.slice(0, 280),
        charCount: c.charCount,
        reviewStatus: c.reviewStatus ?? REVIEW_STATUS.PENDING,
        topicCategory: c.topicCategory ?? "other",
        reviewNotes: c.reviewNotes,
        reviewedAt: c.reviewedAt?.toISOString() ?? null,
        reviewedBy: c.reviewedBy ?? null,
        sessionId: typeof meta.sessionId === "string" ? meta.sessionId : null,
        participant: typeof meta.participant === "string" ? meta.participant : null,
        updatedAt: c.updatedAt.toISOString(),
      };
    }

    return NextResponse.json({
      companySlug: company.slug,
      stats,
      referencePreview: referencePreview.map((c) => ({
        ...c,
        preview: c.content.slice(0, 280),
        updatedAt: c.updatedAt.toISOString(),
      })),
      experiencePreview: experiencePreview.map(mapExperienceChunk),
      experienceList: experienceList.map(mapExperienceChunk),
    });
  } catch (error) {
    console.error("Knowledge API error:", error);
    return NextResponse.json({ error: "Failed to load knowledge index" }, { status: 500 });
  }
}
