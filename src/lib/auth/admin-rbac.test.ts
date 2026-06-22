import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_ROLES,
  canAccessCompany,
  hasPermission,
  PERMISSIONS,
} from "@/lib/auth/admin-rbac";

describe("admin RBAC", () => {
  it("super admin has manage companies permission", () => {
    assert.equal(hasPermission(ADMIN_ROLES.SUPER_ADMIN, PERMISSIONS.MANAGE_COMPANIES), true);
  });

  it("company admin cannot manage companies globally", () => {
    assert.equal(hasPermission(ADMIN_ROLES.COMPANY_ADMIN, PERMISSIONS.MANAGE_COMPANIES), false);
  });

  it("reviewer can review answers", () => {
    assert.equal(hasPermission(ADMIN_ROLES.REVIEWER, PERMISSIONS.REVIEW_ANSWERS), true);
    assert.equal(hasPermission(ADMIN_ROLES.REVIEWER, PERMISSIONS.EXPORT_DATA), false);
  });

  it("scopes company access by assignment", () => {
    const session = {
      adminUserId: "u1",
      email: "a@test.com",
      role: ADMIN_ROLES.COMPANY_ADMIN,
      companyId: "c1",
      legacy: false,
      exp: Date.now() + 1000,
    };
    assert.equal(canAccessCompany(session, "c1"), true);
    assert.equal(canAccessCompany(session, "c2"), false);
  });
});
