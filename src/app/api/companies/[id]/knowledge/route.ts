import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { getKnowledgeStats, SOURCE_TYPE } from "@/lib/knowledge/indexer";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { id } = await params;
    const company = await db.company.findUnique({ where: { id }, select: { slug: true } });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const previewLimit = Math.min(Number(searchParams.get("preview") ?? 15), 50);

    const [stats, referencePreview, experiencePreview] = await Promise.all([
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
      db.knowledgeChunk.findMany({
        where: { companySlug: company.slug, sourceType: SOURCE_TYPE.EXPERIENCE },
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
    ]);

    return NextResponse.json({
      companySlug: company.slug,
      stats,
      referencePreview: referencePreview.map((c) => ({
        ...c,
        preview: c.content.slice(0, 280),
        updatedAt: c.updatedAt.toISOString(),
      })),
      experiencePreview: experiencePreview.map((c) => ({
        ...c,
        preview: c.content.slice(0, 280),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Knowledge API error:", error);
    return NextResponse.json({ error: "Failed to load knowledge index" }, { status: 500 });
  }
}
