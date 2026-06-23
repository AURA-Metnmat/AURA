import { NextResponse } from "next/server";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { logAdminAudit } from "@/lib/auth/admin-audit";
import { parseFormDataUploads } from "@/lib/upload/form-data-files";
import { replacePhase2QuestionsFromFile } from "@/lib/interview/phase2-mutations";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.MANAGE_CAMPAIGNS);
  if (session instanceof NextResponse) return session;

  try {
    const formData = await request.formData();
    const uploads = await parseFormDataUploads(formData, ["file", "files"]);
    if (uploads.length === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const file = uploads[0]!;
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File must be 5 MB or smaller" }, { status: 400 });
    }

    const count = await replacePhase2QuestionsFromFile(companyId, file.fileName, file.buffer);

    await logAdminAudit({
      action: "phase2.upload",
      request,
      session,
      companyId,
      resourceType: "phase2_questions",
      metadata: { fileName: file.fileName, questionCount: count },
    });

    return NextResponse.json({
      success: true,
      message: `Imported ${count} Phase 2 question(s) from ${file.fileName}`,
      questionCount: count,
    });
  } catch (error) {
    const err = error as Error;
    console.error("Phase 2 upload error:", err.message);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
