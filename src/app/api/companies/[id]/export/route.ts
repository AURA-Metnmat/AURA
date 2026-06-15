import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { buildCompanyInterviewWorkbook } from "@/lib/companies/company-interview-export";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;

  try {
    const { buffer, fileName } = await buildCompanyInterviewWorkbook(id);
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
