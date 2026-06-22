import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";
import { EXPORT_TYPES, recordDataExport } from "@/lib/exports/record-export";
import {
  buildMlJsonl,
  buildMlWorkbook,
  fetchExperienceForExport,
  filterLabel,
  normalizeExportFilter,
  normalizeTopicFilter,
} from "@/lib/knowledge/ml-export";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireCompanyAdmin(request, id, PERMISSIONS.EXPORT_DATA);
  if (session instanceof NextResponse) return session;

  try {
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
    const category = normalizeTopicFilter(searchParams.get("category"));

    const records = await fetchExperienceForExport(company.slug, filter, category);

    await logAdminAudit({
      action: AUDIT_ACTIONS.KNOWLEDGE_EXPORT,
      request,
      session,
      companyId: id,
      resourceType: "knowledge_export",
      metadata: { format, filter, count: records.length },
    });

    const slug = company.slug.replace(/[^a-z0-9-_]/gi, "-");
    const suffix = filterLabel(filter);

    let fileName: string;
    let recordCount = records.length;

    if (format === "jsonl") {
      fileName = `${slug}-ml-${suffix}.jsonl`;
      const body = buildMlJsonl(records);
      await recordDataExport({
        companyId: id,
        exportType: EXPORT_TYPES.KNOWLEDGE_ML,
        format: "jsonl",
        filter,
        recordCount,
        fileName,
        session,
      });
      return new NextResponse(body, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    if (format === "json") {
      fileName = `${slug}-ml-${suffix}.json`;
      await recordDataExport({
        companyId: id,
        exportType: EXPORT_TYPES.KNOWLEDGE_ML,
        format: "json",
        filter,
        recordCount,
        fileName,
        session,
      });
      return NextResponse.json({
        company: company.name,
        companySlug: company.slug,
        filter,
        count: records.length,
        records,
      });
    }

    fileName = `${slug}-ml-${suffix}.xlsx`;
    const buffer = buildMlWorkbook(records, company.slug);
    await recordDataExport({
      companyId: id,
      exportType: EXPORT_TYPES.KNOWLEDGE_ML,
      format: "xlsx",
      filter,
      recordCount,
      fileName,
      session,
    });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("ML export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
