import "@/test/test-env";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createAdminSessionToken,
  getAdminSession,
  verifyAdminSessionToken,
} from "@/lib/auth/admin";
import { ADMIN_ROLES, hasPermission, PERMISSIONS } from "@/lib/auth/admin-rbac";

describe("admin session integration", () => {
  it("round-trips bearer session tokens", async () => {
    const token = createAdminSessionToken({
      adminUserId: "admin-1",
      email: "super@aura.test",
      role: ADMIN_ROLES.SUPER_ADMIN,
      companyId: null,
    });

    const verified = verifyAdminSessionToken(token);
    assert.ok(verified);
    assert.equal(verified?.email, "super@aura.test");
    assert.equal(verified?.role, ADMIN_ROLES.SUPER_ADMIN);

    const session = await getAdminSession(
      new Request("http://localhost/api/admin/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    assert.ok(session);
    assert.equal(session?.adminUserId, "admin-1");
    assert.equal(hasPermission(session!.role, PERMISSIONS.MANAGE_ADMIN_USERS), true);
  });

  it("rejects tampered bearer tokens", async () => {
    const token = createAdminSessionToken({
      email: "admin@aura.test",
      role: ADMIN_ROLES.COMPANY_ADMIN,
      companyId: "co-1",
    });
    const tampered = `${token}x`;
    const session = await getAdminSession(
      new Request("http://localhost", {
        headers: { Authorization: `Bearer ${tampered}` },
      })
    );
    assert.equal(session, null);
  });
});
