import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/admin";
import { assertCompanyAccess } from "@/lib/auth/admin-rbac";
import { requireEmployeeSession } from "@/lib/auth/employee";
import { assertEmployeeOwnsSession } from "@/lib/employees/session-access";
import { createSignedStorageUrl } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const attachment = await db.messageAttachment.findUnique({
    where: { id },
    include: { session: { select: { id: true, companyId: true, employeeId: true } } },
  });

  if (!attachment?.storageKey) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const adminSession = await requireAdminSession(request);
  if (!(adminSession instanceof NextResponse)) {
    const denied = assertCompanyAccess(adminSession, attachment.session.companyId);
    if (!denied) {
      const url = await createSignedStorageUrl(attachment.storageKey, 3600);
      if (!url) {
        return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
      }
      return NextResponse.redirect(url);
    }
  }

  const employeeAuth = await requireEmployeeSession(request, attachment.session.companyId);
  if (employeeAuth instanceof NextResponse) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const denied = await assertEmployeeOwnsSession(request, attachment.session);
  if (denied) return denied;

  const url = await createSignedStorageUrl(attachment.storageKey, 3600);
  if (!url) {
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
  }

  return NextResponse.redirect(url);
}
