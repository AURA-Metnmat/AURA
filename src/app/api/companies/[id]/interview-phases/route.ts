import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";
import { buildPhaseConfig, parsePhaseConfigUpdate } from "@/lib/interview/phase-config";
import { countActivePhase2Questions } from "@/lib/interview/phase2-runner";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.MANAGE_CAMPAIGNS);
  if (session instanceof NextResponse) return session;

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const config = buildPhaseConfig(company);
  const phase2QuestionCount = await countActivePhase2Questions(companyId);

  return NextResponse.json({
    ...config,
    phase2QuestionCount,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.MANAGE_CAMPAIGNS);
  if (session instanceof NextResponse) return session;

  const body = (await request.json()) as Record<string, unknown>;
  const update = parsePhaseConfigUpdate(body);
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const company = await db.company.update({
    where: { id: companyId },
    data: update,
  });

  await logAdminAudit({
    action: AUDIT_ACTIONS.COMPANY_UPDATE,
    request,
    session,
    companyId,
    resourceType: "interview_phases",
    metadata: update,
  });

  const config = buildPhaseConfig(company);
  const phase2QuestionCount = await countActivePhase2Questions(companyId);

  return NextResponse.json({
    ...config,
    phase2QuestionCount,
  });
}
