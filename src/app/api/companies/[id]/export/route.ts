import { NextResponse } from "next/server";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";
import { EXPORT_TYPES, recordDataExport } from "@/lib/exports/record-export";
import { buildCompanyInterviewWorkbook } from "@/lib/companies/company-interview-export";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireCompanyAdmin(request, id, PERMISSIONS.EXPORT_DATA);
  if (session instanceof NextResponse) return session;

  try {
    const { buffer, fileName } = await buildCompanyInterviewWorkbook(id);
    await logAdminAudit({
      action: AUDIT_ACTIONS.KNOWLEDGE_EXPORT,
      request,
      session,
      companyId: id,
      metadata: { format: "xlsx", type: "interview", fileName },
    });
    await recordDataExport({
      companyId: id,
      exportType: EXPORT_TYPES.INTERVIEW,
      format: "xlsx",
      fileName,
      session,
      metadata: { type: "interview" },
    });
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    const status = message === "Company not found" ? 404 : 500;
    console.error("Interview export error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
