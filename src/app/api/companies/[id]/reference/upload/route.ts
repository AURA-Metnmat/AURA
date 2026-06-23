import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";
import { runReferenceImportFromUploads } from "@/lib/import/reference-import";
import {
  isAllowedReferenceUpload,
  MAX_REFERENCE_UPLOAD_BYTES,
} from "@/lib/reference/reference-categories";
import { syncReferenceKnowledgeIndex } from "@/lib/reference/reference-mutations";
import { parseFormDataUploads } from "@/lib/upload/form-data-files";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    const formData = await request.formData();
    const parsed = await parseFormDataUploads(formData);
    const uploads: { fileName: string; buffer: Buffer }[] = [];

    for (const entry of parsed) {
      if (entry.size > MAX_REFERENCE_UPLOAD_BYTES) {
        return NextResponse.json(
          {
            error: `File "${entry.fileName}" exceeds ${Math.round(MAX_REFERENCE_UPLOAD_BYTES / (1024 * 1024))}MB limit`,
          },
          { status: 400 }
        );
      }
      if (!isAllowedReferenceUpload(entry.fileName)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${entry.fileName}. Use Excel, CSV, PDF, TXT, or Markdown.` },
          { status: 400 }
        );
      }
      uploads.push({ fileName: entry.fileName, buffer: entry.buffer });
    }

    if (uploads.length === 0) {
      return NextResponse.json(
        { error: "No valid files uploaded. Choose a supported file type with content." },
        { status: 400 }
      );
    }

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
