import "@/test/test-env";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextResponse } from "next/server";
import { ADMIN_ROLES, PERMISSIONS } from "@/lib/auth/admin-rbac";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { bearerRequest } from "@/test/helpers/admin-request";

describe("API auth guard integration", () => {
  it("returns 401 for export history without credentials", async () => {
    const { GET } = await import("@/app/api/companies/[id]/exports/route");
    const res = await GET(new Request("http://localhost/api/companies/co-1/exports"), {
      params: Promise.resolve({ id: "co-1" }),
    });
    assert.equal(res.status, 401);
  });

  it("returns 403 when company admin accesses another company", async () => {
    const result = await requireCompanyAdmin(
      bearerRequest("/api/companies/co-other/exports", {
        role: ADMIN_ROLES.COMPANY_ADMIN,
        companyId: "co-mine",
        email: "admin@mine.com",
      }),
      "co-other"
    );
    assert.ok(result instanceof NextResponse);
    assert.equal(result.status, 403);
  });

  it("returns 403 when analyst attempts knowledge reindex", async () => {
    const result = await requireCompanyAdmin(
      bearerRequest("/api/companies/co-mine/knowledge/reindex", {
        role: ADMIN_ROLES.ANALYST,
        companyId: "co-mine",
        email: "analyst@mine.com",
      }),
      "co-mine",
      PERMISSIONS.REVIEW_KNOWLEDGE
    );
    assert.ok(result instanceof NextResponse);
    assert.equal(result.status, 403);
  });

  it("blocks reviewer from analytics export permission", async () => {
    const result = await requireCompanyAdmin(
      bearerRequest("/api/companies/co-mine/analytics", {
        role: ADMIN_ROLES.REVIEWER,
        companyId: "co-mine",
        email: "reviewer@mine.com",
      }),
      "co-mine",
      PERMISSIONS.EXPORT_DATA
    );
    assert.ok(result instanceof NextResponse);
    assert.equal(result.status, 403);
  });
});
