export type CampaignStatus = "active" | "expired" | "revoked";

export interface CampaignTiming {
  status: string;
  startsAt: Date | null;
  expiresAt: Date | null;
}

export function getEffectiveCampaignStatus(campaign: CampaignTiming): CampaignStatus {
  if (campaign.status === "revoked") return "revoked";

  const now = new Date();
  if (campaign.expiresAt && campaign.expiresAt < now) return "expired";
  if (campaign.startsAt && campaign.startsAt > now) return "expired";
  if (campaign.status === "expired") return "expired";

  return "active";
}

export function isCampaignJoinable(status: CampaignStatus): boolean {
  return status === "active";
}
