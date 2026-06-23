import { NextResponse } from "next/server";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";
import {
  runReferenceImport,
  runReferenceImportFromUploads,
} from "@/lib/import/reference-import";
import { syncReferenceKnowledgeIndex } from "@/lib/reference/reference-mutations";
import { db } from "@/lib/db";
import { parseFormDataUploads } from "@/lib/upload/form-data-files";
import { validateReferenceUploads } from "@/lib/upload/reference-upload";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const companySlug = (formData.get("companySlug") as string | null)?.trim();
      if (!companySlug) {
        return NextResponse.json({ error: "companySlug required" }, { status: 400 });
      }

      const company = await db.company.findUnique({
        where: { slug: companySlug },
        select: { id: true, slug: true },
      });
      if (!company) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
      }

      const session = await requireCompanyAdmin(request, company.id, PERMISSIONS.REVIEW_KNOWLEDGE);
      if (session instanceof NextResponse) return session;

      const parsed = await parseFormDataUploads(formData);
      const validated = validateReferenceUploads(parsed);
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 });
      }
      const uploads = validated.uploads.map((entry) => ({
        fileName: entry.fileName,
        buffer: entry.buffer,
      }));

      const stats = await runReferenceImportFromUploads(company.slug, uploads);
      const chunkCount = await syncReferenceKnowledgeIndex(company.slug, company.id);

      await logAdminAudit({
        action: AUDIT_ACTIONS.REFERENCE_UPLOAD,
        request,
        session,
        companyId: company.id,
        resourceType: "reference_upload",
        metadata: { fileNames: uploads.map((u) => u.fileName), chunkCount, stats },
      });

      return NextResponse.json({
        success: true,
        message: `Imported ${uploads.length} file(s) for ${companySlug}`,
        stats,
        chunkCount,
      });
    }

    const body = await request.json().catch(() => ({}));
    const companySlug = (body as { companySlug?: string }).companySlug?.trim();
    if (!companySlug) {
      return NextResponse.json({ error: "companySlug required" }, { status: 400 });
    }

    const company = await db.company.findUnique({
      where: { slug: companySlug },
      select: { id: true, slug: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const session = await requireCompanyAdmin(request, company.id, PERMISSIONS.REVIEW_KNOWLEDGE);
    if (session instanceof NextResponse) return session;

    const stats = await runReferenceImport(companySlug);
    const chunkCount = await syncReferenceKnowledgeIndex(company.slug, company.id);

    return NextResponse.json({
      success: true,
      message: `Reference data imported from server folder for ${companySlug}`,
      stats,
      chunkCount,
    });
  } catch (error) {
    const err = error as Error;
    console.error("Import error:", err.message);
    return NextResponse.json({ error: "Import failed", details: err.message }, { status: 500 });
  }
}
