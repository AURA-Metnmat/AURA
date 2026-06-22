import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/admin";
import { assertCompanyAccess } from "@/lib/auth/admin-rbac";

export async function GET(request: Request) {
  const session = await requireAdminSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const companySlug = searchParams.get("companySlug")?.trim();

    if (!companySlug) {
      return NextResponse.json(
        { error: "companySlug query parameter is required" },
        { status: 400 }
      );
    }

    const company = await db.company.findUnique({
      where: { slug: companySlug },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const accessDenied = assertCompanyAccess(session, company.id);
    if (accessDenied) return accessDenied;

    const fileWhere = { companySlug };

    const [files, insights, furnaceSpecs, pdfs, stats] = await Promise.all([
      db.dataFile.findMany({
        where: fileWhere,
        orderBy: { importedAt: "desc" },
        take: 50,
      }),
      db.dataInsight.findMany({
        where: { file: { companySlug } },
        orderBy: { priority: "asc" },
        take: 50,
      }),
      db.furnaceSpec.findMany({
        where: { companySlug },
        orderBy: { parameter: "asc" },
      }),
      db.pdfDocument.findMany({
        where: { companySlug },
      }),
      Promise.all([
        db.dataFile.count({ where: fileWhere }),
        db.dataRecord.count({
          where: { file: { companySlug } },
        }),
        db.dataInsight.count({
          where: { file: { companySlug } },
        }),
        db.furnaceSpec.count({
          where: { companySlug },
        }),
      ]),
    ]);

    const [fileCount, recordCount, insightCount, specCount] = stats;

    return NextResponse.json({
      files,
      insights,
      furnaceSpecs,
      pdfs,
      stats: { fileCount, recordCount, insightCount, specCount },
    });
  } catch (error) {
    console.error("Reference API error:", error);
    return NextResponse.json({ error: "Failed to load reference data" }, { status: 500 });
  }
}
