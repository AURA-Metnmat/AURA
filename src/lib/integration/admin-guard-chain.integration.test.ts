import "@/test/test-env";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_ROLES,
  PERMISSIONS,
  assertCompanyAccess,
  companyScopeFilter,
  hasPermission,
  requirePermission,
  requireSuperAdmin,
  type AdminSession,
} from "@/lib/auth/admin-rbac";

function session(
  overrides: Partial<AdminSession> & Pick<AdminSession, "role">
): AdminSession {
  return {
    adminUserId: "user-1",
    email: "test@example.com",
    companyId: null,
    legacy: false,
    exp: Date.now() + 60_000,
    ...overrides,
  };
}

describe("admin guard chain integration", () => {
  it("scopes company list for company admin", () => {
    const s = session({
      role: ADMIN_ROLES.COMPANY_ADMIN,
      companyId: "company-a",
    });
    assert.deepEqual(companyScopeFilter(s), { id: "company-a" });
    assert.equal(assertCompanyAccess(s, "company-a"), null);
    assert.equal(assertCompanyAccess(s, "company-b")?.status, 403);
  });

  it("allows super admin across companies with manage permission", () => {
    const s = session({ role: ADMIN_ROLES.SUPER_ADMIN });
    assert.equal(hasPermission(s.role, PERMISSIONS.MANAGE_COMPANIES), true);
    assert.equal(assertCompanyAccess(s, "any-company"), null);
    assert.equal(requireSuperAdmin(s), null);
  });

  it("blocks reviewer from exports but allows knowledge review", () => {
    const s = session({
      role: ADMIN_ROLES.REVIEWER,
      companyId: "company-a",
    });
    assert.equal(hasPermission(s.role, PERMISSIONS.REVIEW_KNOWLEDGE), true);
    assert.equal(hasPermission(s.role, PERMISSIONS.EXPORT_DATA), false);
    assert.equal(requirePermission(s, PERMISSIONS.EXPORT_DATA)?.status, 403);
    assert.equal(requirePermission(s, PERMISSIONS.REVIEW_ANSWERS), null);
  });

  it("allows analyst export only for assigned company", () => {
    const s = session({
      role: ADMIN_ROLES.ANALYST,
      companyId: "company-a",
    });
    assert.equal(requirePermission(s, PERMISSIONS.EXPORT_DATA), null);
    assert.equal(assertCompanyAccess(s, "company-a"), null);
    assert.equal(assertCompanyAccess(s, "company-b")?.status, 403);
    assert.equal(requirePermission(s, PERMISSIONS.MANAGE_CAMPAIGNS)?.status, 403);
  });

  it("legacy sessions retain super-admin-like access", () => {
    const s = session({
      role: ADMIN_ROLES.COMPANY_ADMIN,
      companyId: "company-a",
      legacy: true,
    });
    assert.deepEqual(companyScopeFilter(s), {});
    assert.equal(assertCompanyAccess(s, "company-b"), null);
    assert.equal(requireSuperAdmin(s), null);
  });
});
