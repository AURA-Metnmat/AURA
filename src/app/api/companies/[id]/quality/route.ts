import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { getCompanyQualityKpis } from "@/lib/refinement/quality-stats";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id: companyId } = await params;
  const company = await db.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const kpis = await getCompanyQualityKpis(companyId);
  return NextResponse.json({ kpis });
}
