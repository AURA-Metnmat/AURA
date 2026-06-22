import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { getInterviewLink } from "@/lib/aura/company-utils";
import {
  ensureDefaultCampaign,
  generateCampaignInviteToken,
} from "@/lib/campaigns/resolve";
import { getEffectiveCampaignStatus } from "@/lib/campaigns/status";

function formatCampaign(
  campaign: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    inviteToken: string | null;
    startsAt: Date | null;
    expiresAt: Date | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count?: { questions: number; sessions: number };
  },
  request?: Request
) {
  const effectiveStatus = getEffectiveCampaignStatus(campaign);
  return {
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
    questionCount: campaign._count?.questions ?? 0,
    sessionCount: campaign._count?.sessions ?? 0,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id: companyId } = await params;
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, inviteToken: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  await ensureDefaultCampaign(companyId, company.inviteToken);

  const campaigns = await db.interviewCampaign.findMany({
    where: { companyId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { questions: true, sessions: true } } },
  });

  return NextResponse.json({
    campaigns: campaigns.map((c) => formatCampaign(c, request)),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id: companyId } = await params;
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    name?: string;
    description?: string;
    expiresAt?: string | null;
    startsAt?: string | null;
    generateLink?: boolean;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
  }

  const inviteToken = body.generateLink !== false ? generateCampaignInviteToken() : null;

  const campaign = await db.interviewCampaign.create({
    data: {
      companyId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      status: "active",
      inviteToken,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      isDefault: false,
    },
    include: { _count: { select: { questions: true, sessions: true } } },
  });

  return NextResponse.json({ campaign: formatCampaign(campaign, request) }, { status: 201 });
}
