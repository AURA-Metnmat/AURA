import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { reindexCompanyKnowledge } from "@/lib/knowledge/indexer";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { id } = await params;
    const company = await db.company.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const scope =
      (body as { scope?: string }).scope === "reference" ||
      (body as { scope?: string }).scope === "experience"
        ? ((body as { scope: "reference" | "experience" }).scope)
        : "all";

    const result = await reindexCompanyKnowledge({
      companySlug: company.slug,
      companyId: company.id,
      scope,
    });

    return NextResponse.json({
      success: true,
      scope,
      indexed: result,
      message: `Indexed ${result.reference} reference and ${result.experience} experience chunks`,
    });
  } catch (error) {
    const err = error as Error;
    console.error("Knowledge reindex error:", err.message);
    return NextResponse.json(
      { error: "Reindex failed", details: err.message },
      { status: 500 }
    );
  }
}
