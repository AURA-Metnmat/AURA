import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import {
  buildMlJsonl,
  buildMlWorkbook,
  fetchExperienceForExport,
  filterLabel,
  normalizeExportFilter,
} from "@/lib/knowledge/ml-export";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { id } = await params;
    const company = await db.company.findUnique({
      where: { id },
      select: { slug: true, name: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "xlsx";
    const filter = normalizeExportFilter(searchParams.get("filter"));

    const records = await fetchExperienceForExport(company.slug, filter);
    const slug = company.slug.replace(/[^a-z0-9-_]/gi, "-");
    const suffix = filterLabel(filter);

    if (format === "jsonl") {
      const body = buildMlJsonl(records);
      return new NextResponse(body, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Content-Disposition": `attachment; filename="${slug}-ml-${suffix}.jsonl"`,
        },
      });
    }

    if (format === "json") {
      return NextResponse.json({
        company: company.name,
        companySlug: company.slug,
        filter,
        count: records.length,
        records,
      });
    }

    const buffer = buildMlWorkbook(records, company.slug);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${slug}-ml-${suffix}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("ML export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
