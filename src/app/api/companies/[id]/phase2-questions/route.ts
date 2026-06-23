import { NextResponse } from "next/server";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { listPhase2Questions } from "@/lib/interview/phase2-mutations";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.MANAGE_CAMPAIGNS);
  if (session instanceof NextResponse) return session;

  const questions = await listPhase2Questions(companyId);
  return NextResponse.json({ questions });
}
