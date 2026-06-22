import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string; linkId: string }> }
) {
  const { id: companyId, campaignId, linkId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.MANAGE_CAMPAIGNS);
  if (session instanceof NextResponse) return session;

  const campaign = await db.interviewCampaign.findFirst({
    where: { id: campaignId, companyId },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const link = await db.campaignQuestion.findFirst({
    where: { id: linkId, campaignId },
  });
  if (!link) {
    return NextResponse.json({ error: "Campaign question not found" }, { status: 404 });
  }

  await db.campaignQuestion.delete({ where: { id: linkId } });

  const remaining = await db.campaignQuestion.findMany({
    where: { campaignId },
    orderBy: { sortOrder: "asc" },
  });

  await db.$transaction(
    remaining.map((q, index) =>
      db.campaignQuestion.update({
        where: { id: q.id },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
