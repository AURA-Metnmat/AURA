import { db } from "@/lib/db";
import { generateInviteToken } from "@/lib/aura/company-utils";
import {
  getEffectiveCampaignStatus,
  isCampaignJoinable,
  type CampaignStatus,
} from "@/lib/campaigns/status";

export interface ResolvedCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  isDefault: boolean;
  expiresAt: string | null;
}

export interface ResolvedInterviewAccess {
  company: {
    id: string;
    name: string;
    slug: string;
    category: string | null;
    industry: string | null;
    description: string | null;
    interviewDurationMinutes: number;
  };
  campaign: ResolvedCampaign;
}

const companySelect = {
  id: true,
  name: true,
  slug: true,
  category: true,
  industry: true,
  description: true,
  interviewDurationMinutes: true,
  inviteToken: true,
  isActive: true,
} as const;

export async function ensureDefaultCampaign(companyId: string, companyInviteToken: string) {
  const existing = await db.interviewCampaign.findFirst({
    where: { companyId, isDefault: true },
  });

  if (existing) {
    if (existing.inviteToken !== companyInviteToken) {
      return db.interviewCampaign.update({
        where: { id: existing.id },
        data: { inviteToken: companyInviteToken },
      });
    }
    return existing;
  }

  return db.interviewCampaign.create({
    data: {
      companyId,
      name: "Default Interview",
      description: "Default campaign linked to the company invite link",
      status: "active",
      inviteToken: companyInviteToken,
      isDefault: true,
    },
  });
}

export async function resolveCampaignForCompany(
  companyId: string,
  campaignId?: string | null
): Promise<{ id: string; status: CampaignStatus } | null> {
  if (campaignId) {
    const campaign = await db.interviewCampaign.findFirst({
      where: { id: campaignId, companyId },
    });
    if (!campaign) return null;
    const status = getEffectiveCampaignStatus(campaign);
    if (!isCampaignJoinable(status)) return null;
    return { id: campaign.id, status };
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { inviteToken: true },
  });
  if (!company) return null;

  const defaultCampaign = await ensureDefaultCampaign(companyId, company.inviteToken);
  const status = getEffectiveCampaignStatus(defaultCampaign);
  if (!isCampaignJoinable(status)) return null;
  return { id: defaultCampaign.id, status };
}

export async function resolveInterviewAccessByToken(
  token: string
): Promise<ResolvedInterviewAccess | null> {
  const campaignByToken = await db.interviewCampaign.findFirst({
    where: { inviteToken: token },
    include: { company: { select: companySelect } },
  });

  if (campaignByToken) {
    if (!campaignByToken.company.isActive) return null;
    const status = getEffectiveCampaignStatus(campaignByToken);
    if (!isCampaignJoinable(status)) return null;
    return {
      company: {
        id: campaignByToken.company.id,
        name: campaignByToken.company.name,
        slug: campaignByToken.company.slug,
        category: campaignByToken.company.category,
        industry: campaignByToken.company.industry,
        description: campaignByToken.company.description,
        interviewDurationMinutes: campaignByToken.company.interviewDurationMinutes,
      },
      campaign: {
        id: campaignByToken.id,
        name: campaignByToken.name,
        status,
        isDefault: campaignByToken.isDefault,
        expiresAt: campaignByToken.expiresAt?.toISOString() ?? null,
      },
    };
  }

  const company = await db.company.findUnique({
    where: { inviteToken: token, isActive: true },
    select: companySelect,
  });

  if (!company) return null;

  const defaultCampaign = await ensureDefaultCampaign(company.id, company.inviteToken);
  const status = getEffectiveCampaignStatus(defaultCampaign);
  if (!isCampaignJoinable(status)) return null;

  return {
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      category: company.category,
      industry: company.industry,
      description: company.description,
      interviewDurationMinutes: company.interviewDurationMinutes,
    },
    campaign: {
      id: defaultCampaign.id,
      name: defaultCampaign.name,
      status,
      isDefault: defaultCampaign.isDefault,
      expiresAt: defaultCampaign.expiresAt?.toISOString() ?? null,
    },
  };
}

export function generateCampaignInviteToken(): string {
  return generateInviteToken();
}
