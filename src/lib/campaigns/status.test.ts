import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getEffectiveCampaignStatus, isCampaignJoinable } from "@/lib/campaigns/status";

describe("campaign status", () => {
  it("returns revoked when status is revoked", () => {
    assert.equal(
      getEffectiveCampaignStatus({ status: "revoked", startsAt: null, expiresAt: null }),
      "revoked"
    );
  });

  it("returns expired when past expiresAt", () => {
    const past = new Date(Date.now() - 60_000);
    assert.equal(
      getEffectiveCampaignStatus({ status: "active", startsAt: null, expiresAt: past }),
      "expired"
    );
  });

  it("returns expired when before startsAt", () => {
    const future = new Date(Date.now() + 86_400_000);
    assert.equal(
      getEffectiveCampaignStatus({ status: "active", startsAt: future, expiresAt: null }),
      "expired"
    );
  });

  it("joinable only when active", () => {
    assert.equal(isCampaignJoinable("active"), true);
    assert.equal(isCampaignJoinable("expired"), false);
    assert.equal(isCampaignJoinable("revoked"), false);
  });
});
