import { NextResponse } from "next/server";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { deleteEmployeeOrSession } from "@/lib/companies/delete-employee";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id, sessionId } = await params;
  const session = await requireCompanyAdmin(request, id, PERMISSIONS.MANAGE_COMPANIES);
  if (session instanceof NextResponse) return session;

  try {
    const result = await deleteEmployeeOrSession(id, sessionId);
    if (!result) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Delete employee/session error:", error);
    return NextResponse.json({ error: "Failed to delete employee data" }, { status: 500 });
  }
}
