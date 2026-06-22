import { NextResponse } from "next/server";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { listCompanyExportLogs } from "@/lib/exports/record-export";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireCompanyAdmin(request, id, PERMISSIONS.EXPORT_DATA);
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? 50);
    const exports = await listCompanyExportLogs(id, limit);
    return NextResponse.json({ exports });
  } catch (error) {
    console.error("Export history error:", error);
    return NextResponse.json({ error: "Failed to load export history" }, { status: 500 });
  }
}
