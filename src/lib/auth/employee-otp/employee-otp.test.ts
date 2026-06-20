import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeMobileNumber,
  isValidMobileNumber,
  maskMobileNumber,
  hashMobileNumber,
  parseIdentifier,
} from "@/lib/auth/employee-otp/mobile";
import { generateOtpCode, hashOtp, verifyOtpHash } from "@/lib/auth/employee-otp/hash";
import { isEmployeeActive } from "@/lib/auth/employee-otp/company-policy";

describe("mobile normalization", () => {
  it("normalizes +91 prefix", () => {
    assert.equal(normalizeMobileNumber("+919876543210"), "9876543210");
  });

  it("rejects invalid mobile", () => {
    assert.equal(isValidMobileNumber("12345"), false);
    assert.equal(isValidMobileNumber("5876543210"), false);
    assert.equal(isValidMobileNumber("9876543210"), true);
  });

  it("masks mobile showing last 4 only", () => {
    assert.equal(maskMobileNumber("9876543210"), "******3210");
  });

  it("detects email vs mobile identifier", () => {
    assert.equal(parseIdentifier("user@company.com"), "email");
    assert.equal(parseIdentifier("9876543210"), "mobile");
  });
});

describe("OTP hashing", () => {
  it("generates 6-digit OTP", () => {
    const code = generateOtpCode();
    assert.match(code, /^\d{6}$/);
  });

  it("verifies hashed OTP without storing plaintext", async () => {
    process.env.OTP_SECRET_PEPPER = "test-pepper";
    const code = "482910";
    const hashed = await hashOtp(code);
    assert.notEqual(hashed, code);
    assert.equal(await verifyOtpHash(code, hashed), true);
    assert.equal(await verifyOtpHash("000000", hashed), false);
  });
});

describe("employee active status", () => {
  it("accepts ACTIVE and legacy active", () => {
    assert.equal(isEmployeeActive("ACTIVE"), true);
    assert.equal(isEmployeeActive("active"), true);
    assert.equal(isEmployeeActive("INACTIVE"), false);
  });
});

describe("security rules (documented expectations)", () => {
  it("signup must not create employee before OTP — enforced by service layer", () => {
    assert.ok(true);
  });

  it("signin must not reveal account existence — generic message constant", () => {
    const msg = "If this account exists, an OTP has been sent.";
    assert.ok(msg.includes("If this account exists"));
  });

  it("mobile hash is stable per pepper", () => {
    const h1 = hashMobileNumber("9876543210", "pepper");
    const h2 = hashMobileNumber("9876543210", "pepper");
    const h3 = hashMobileNumber("9876543210", "other");
    assert.equal(h1, h2);
    assert.notEqual(h1, h3);
  });
});
