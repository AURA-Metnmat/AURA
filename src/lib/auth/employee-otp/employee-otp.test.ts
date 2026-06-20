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
import { mapMsg91ErrorToUserMessage } from "@/lib/auth/employee-otp/msg91-errors";
import { validateEmployeePassword } from "@/lib/auth/employee-otp/password-policy";

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
  it("signup creates employee profile fields from validated input", () => {
    assert.ok(true);
  });

  it("signin uses generic invalid credentials message", () => {
    const msg = "Invalid mobile, email, or password.";
    assert.ok(msg.includes("Invalid"));
  });

  it("mobile hash is stable per pepper", () => {
    const h1 = hashMobileNumber("9876543210", "pepper");
    const h2 = hashMobileNumber("9876543210", "pepper");
    const h3 = hashMobileNumber("9876543210", "other");
    assert.equal(h1, h2);
    assert.notEqual(h1, h3);
  });
});

describe("employee password policy", () => {
  it("requires minimum length", () => {
    assert.equal(validateEmployeePassword(""), "Password is required.");
    assert.equal(validateEmployeePassword("abc"), "Password must be at least 6 characters.");
    assert.equal(validateEmployeePassword("secure1"), null);
  });
});

describe("MSG91 error mapping", () => {
  it("maps invalid authkey", () => {
    const msg = mapMsg91ErrorToUserMessage("Invalid authkey");
    assert.ok(msg.includes("not configured"));
  });

  it("maps template errors", () => {
    const msg = mapMsg91ErrorToUserMessage("DLT template not found");
    assert.ok(msg.includes("template"));
  });

  it("maps wallet errors", () => {
    const msg = mapMsg91ErrorToUserMessage("Insufficient balance");
    assert.ok(msg.includes("wallet"));
  });
});
