import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";
import { runReferenceImportFromUploads } from "@/lib/import/reference-import";
import { syncReferenceKnowledgeIndex } from "@/lib/reference/reference-mutations";
import {
  parseReferenceUploadRequest,
  validateReferenceUploads,
} from "@/lib/upload/reference-upload";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.REVIEW_KNOWLEDGE);
  if (session instanceof NextResponse) return session;

  try {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { id: true, slug: true, name: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const parsed = await parseReferenceUploadRequest(request);
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
      companyId,
      resourceType: "reference_upload",
      metadata: {
        fileNames: uploads.map((u) => u.fileName),
        chunkCount,
        stats,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Imported ${uploads.length} file(s) and synced ${chunkCount} knowledge chunks`,
      stats,
      chunkCount,
    });
  } catch (error) {
    const err = error as Error;
    console.error("Reference upload error:", err.message);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
