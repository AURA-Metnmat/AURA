import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";
import { EXPORT_TYPES, recordDataExport } from "@/lib/exports/record-export";
import {
  buildAnswerExportJsonl,
  fetchAnswersForExport,
} from "@/lib/companies/answer-export";
import { parseIntParam } from "@/lib/http/query-params";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.EXPORT_DATA);
  if (session instanceof NextResponse) return session;

  try {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { slug: true, name: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "jsonl";

    const records = await fetchAnswersForExport(companyId, {
      employeeId: searchParams.get("employeeId"),
      sessionId: searchParams.get("sessionId"),
      department: searchParams.get("department"),
      campaignId: searchParams.get("campaignId"),
      status: searchParams.get("status"),
      confidenceMin: searchParams.get("confidenceMin"),
      confidenceMax: searchParams.get("confidenceMax"),
      limit: parseIntParam(searchParams.get("limit"), 5000, { min: 1, max: 50000 }),
    });

    const slug = company.slug.replace(/[^a-z0-9-_]/gi, "-");
    const suffix = searchParams.get("employeeId")
      ? `employee-${searchParams.get("employeeId")!.slice(0, 8)}`
      : searchParams.get("sessionId")
        ? `session-${searchParams.get("sessionId")!.slice(0, 8)}`
        : "all";

    await logAdminAudit({
      action: AUDIT_ACTIONS.KNOWLEDGE_EXPORT,
      request,
      session,
      companyId,
      resourceType: "answer_export",
      metadata: {
        format,
        count: records.length,
        employeeId: searchParams.get("employeeId"),
        sessionId: searchParams.get("sessionId"),
      },
    });

    if (format === "json") {
      await recordDataExport({
        companyId,
        exportType: EXPORT_TYPES.ANSWERS_ML,
        format: "json",
        filter: suffix,
        recordCount: records.length,
        fileName: `${slug}-answers-${suffix}.json`,
        session,
      });
      return NextResponse.json({
        company: company.name,
        companySlug: company.slug,
        count: records.length,
        records,
      });
    }

    const fileName = `${slug}-answers-${suffix}.jsonl`;
    const body = buildAnswerExportJsonl(records);

    await recordDataExport({
      companyId,
      exportType: EXPORT_TYPES.ANSWERS_ML,
      format: "jsonl",
      filter: suffix,
      recordCount: records.length,
      fileName,
      session,
    });

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Answer export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
