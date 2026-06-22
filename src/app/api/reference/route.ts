import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/admin";
import { assertCompanyAccess } from "@/lib/auth/admin-rbac";

export async function GET(request: Request) {
  const session = await requireAdminSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const companySlug = searchParams.get("companySlug");

    if (companySlug) {
      const company = await db.company.findUnique({
        where: { slug: companySlug },
        select: { id: true },
      });
      if (!company) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
      }
      const accessDenied = assertCompanyAccess(session, company.id);
      if (accessDenied) return accessDenied;
    }

    const fileWhere = companySlug ? { companySlug } : {};

    const [files, insights, furnaceSpecs, pdfs, stats] = await Promise.all([
      db.dataFile.findMany({
        where: fileWhere,
        orderBy: { importedAt: "desc" },
        take: 50,
      }),
      db.dataInsight.findMany({
        where: companySlug ? { file: { companySlug } } : {},
        orderBy: { priority: "asc" },
        take: 50,
      }),
      db.furnaceSpec.findMany({
        where: companySlug ? { companySlug } : {},
        orderBy: { parameter: "asc" },
      }),
      db.pdfDocument.findMany({
        where: companySlug ? { companySlug } : {},
      }),
      Promise.all([
        db.dataFile.count({ where: fileWhere }),
        db.dataRecord.count({
          where: companySlug ? { file: { companySlug } } : {},
        }),
        db.dataInsight.count({
          where: companySlug ? { file: { companySlug } } : {},
        }),
        db.furnaceSpec.count({
          where: companySlug ? { companySlug } : {},
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
