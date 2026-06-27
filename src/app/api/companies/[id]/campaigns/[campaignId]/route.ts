import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { getInterviewLink } from "@/lib/aura/company-utils";
import { generateCampaignInviteToken } from "@/lib/campaigns/resolve";
import { getEffectiveCampaignStatus } from "@/lib/campaigns/status";
import { parseDateParam } from "@/lib/http/query-params";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const { id: companyId, campaignId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.MANAGE_CAMPAIGNS);
  if (session instanceof NextResponse) return session;

  const body = (await request.json()) as {
    name?: string;
    description?: string | null;
    status?: "active" | "revoked" | "expired";
    expiresAt?: string | null;
    startsAt?: string | null;
    regenerateInviteToken?: boolean;
  };

  const existing = await db.interviewCampaign.findFirst({
    where: { id: campaignId, companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (existing.isDefault && body.status === "revoked") {
    return NextResponse.json(
      { error: "The default campaign cannot be revoked. Create a separate campaign instead." },
      { status: 400 }
    );
  }

  let inviteToken = existing.inviteToken;
  if (body.regenerateInviteToken && !existing.isDefault) {
    inviteToken = generateCampaignInviteToken();
  }

  const campaign = await db.interviewCampaign.update({
    where: { id: campaignId },
    data: {
      ...(body.name?.trim() && { name: body.name.trim() }),
      ...(body.description !== undefined && { description: body.description?.trim() || null }),
      ...(body.status && { status: body.status }),
      ...(body.expiresAt !== undefined && {
        expiresAt: parseDateParam(body.expiresAt),
      }),
      ...(body.startsAt !== undefined && {
        startsAt: parseDateParam(body.startsAt),
      }),
      ...(body.regenerateInviteToken && !existing.isDefault && { inviteToken }),
    },
    include: { _count: { select: { questions: true, sessions: true } } },
  });

  const effectiveStatus = getEffectiveCampaignStatus(campaign);

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      status: campaign.status,
      effectiveStatus,
      inviteToken: campaign.inviteToken,
      interviewLink: campaign.inviteToken
        ? getInterviewLink(campaign.inviteToken, request)
        : null,
      startsAt: campaign.startsAt?.toISOString() ?? null,
      expiresAt: campaign.expiresAt?.toISOString() ?? null,
      isDefault: campaign.isDefault,
      questionCount: campaign._count.questions,
      sessionCount: campaign._count.sessions,
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const { id: companyId, campaignId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.MANAGE_CAMPAIGNS);
  if (session instanceof NextResponse) return session;

  const existing = await db.interviewCampaign.findFirst({
    where: { id: campaignId, companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (existing.isDefault) {
    return NextResponse.json(
      { error: "The default campaign cannot be deleted." },
      { status: 400 }
    );
  }

  await db.interviewCampaign.delete({ where: { id: campaignId } });

  return NextResponse.json({ success: true });
}
