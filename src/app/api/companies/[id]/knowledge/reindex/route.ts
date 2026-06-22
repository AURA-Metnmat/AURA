import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { reindexCompanyKnowledge } from "@/lib/knowledge/indexer";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireCompanyAdmin(request, id, PERMISSIONS.REVIEW_KNOWLEDGE);
  if (session instanceof NextResponse) return session;

  try {
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
