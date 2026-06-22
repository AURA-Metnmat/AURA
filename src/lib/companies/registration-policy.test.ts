import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canRegisterOnInterviewLink,
  canRegisterWithPublicPolicy,
  isSelfRegistrationAllowed,
  normalizeAllowedEmailDomains,
  parseRegistrationPolicyUpdate,
  toPublicRegistrationPolicy,
  validateEmailAgainstPolicy,
} from "./registration-policy";

const openPolicy = {
  allowEmployeeSelfRegistration: true,
  requireMobileOtpForEmployeeLogin: false,
  allowedEmailDomains: null,
  registrationMode: "OPEN" as const,
};

describe("registration policy", () => {
  it("normalizes allowed email domains", () => {
    assert.equal(normalizeAllowedEmailDomains(" Acme.COM , @acme.in "), "acme.com,acme.in");
  });

  it("rejects invalid domain input", () => {
    assert.equal(normalizeAllowedEmailDomains("not-a-domain"), null);
  });

  it("blocks registration when mode is closed", () => {
    assert.equal(
      isSelfRegistrationAllowed({ ...openPolicy, registrationMode: "CLOSED" }),
      false
    );
  });

  it("requires invite token for invite-only mode", () => {
    const inviteOnly = { ...openPolicy, registrationMode: "INVITE_ONLY" as const };
    assert.equal(canRegisterOnInterviewLink(inviteOnly, false), false);
    assert.equal(canRegisterOnInterviewLink(inviteOnly, true), true);
  });

  it("parses policy updates", () => {
    const parsed = parseRegistrationPolicyUpdate({
      registrationMode: "invite_only",
      allowedEmailDomains: "metnmat.com",
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.data.registrationMode, "INVITE_ONLY");
      assert.equal(parsed.data.allowedEmailDomains, "metnmat.com");
    }
  });

  it("validates email domains", () => {
    assert.equal(validateEmailAgainstPolicy("a@metnmat.com", "metnmat.com,other.com"), true);
    assert.equal(validateEmailAgainstPolicy("a@other.com", "metnmat.com"), false);
  });

  it("formats public policy for interview clients", () => {
    const pub = toPublicRegistrationPolicy({
      ...openPolicy,
      allowedEmailDomains: "metnmat.com",
      registrationMode: "INVITE_ONLY",
    });
    assert.equal(pub.allowSelfRegistration, true);
    assert.equal(pub.domainHint, "Use your @metnmat.com email address.");
    assert.equal(canRegisterWithPublicPolicy(pub, false), false);
    assert.equal(canRegisterWithPublicPolicy(pub, true), true);
  });
});
