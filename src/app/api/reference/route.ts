import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const companySlug = searchParams.get("companySlug");

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
