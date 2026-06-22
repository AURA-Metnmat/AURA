import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";
import { isReferenceFileCategory } from "@/lib/reference/reference-categories";
import {
  deleteReferenceDataFile,
  getReferenceDataFileForEdit,
  syncReferenceKnowledgeIndex,
  updateReferenceDataFile,
} from "@/lib/reference/reference-mutations";

async function resolveCompany(companyId: string) {
  return db.company.findUnique({
    where: { id: companyId },
    select: { id: true, slug: true },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id: companyId, fileId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.REVIEW_KNOWLEDGE);
  if (session instanceof NextResponse) return session;

  const company = await resolveCompany(companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const file = await getReferenceDataFileForEdit(company.slug, fileId);
  if (!file) {
    return NextResponse.json({ error: "Reference file not found" }, { status: 404 });
  }

  return NextResponse.json({ file });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id: companyId, fileId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.REVIEW_KNOWLEDGE);
  if (session instanceof NextResponse) return session;

  const company = await resolveCompany(companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    fileName?: string;
    description?: string | null;
    category?: string;
  };

  if (body.category !== undefined && !isReferenceFileCategory(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  try {
    const updated = await updateReferenceDataFile(company.slug, fileId, body);
    if (!updated) {
      return NextResponse.json({ error: "Reference file not found" }, { status: 404 });
    }

    const chunkCount = await syncReferenceKnowledgeIndex(company.slug, company.id);

    await logAdminAudit({
      action: AUDIT_ACTIONS.REFERENCE_UPDATE,
      request,
      session,
      companyId,
      resourceType: "reference_data_file",
      resourceId: fileId,
      metadata: { fileName: updated.fileName, chunkCount },
    });

    return NextResponse.json({ success: true, file: updated, chunkCount });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id: companyId, fileId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.REVIEW_KNOWLEDGE);
  if (session instanceof NextResponse) return session;

  const company = await resolveCompany(companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const deleted = await deleteReferenceDataFile(company.slug, fileId);
  if (!deleted) {
    return NextResponse.json({ error: "Reference file not found" }, { status: 404 });
  }

  const chunkCount = await syncReferenceKnowledgeIndex(company.slug, company.id);

  await logAdminAudit({
    action: AUDIT_ACTIONS.REFERENCE_DELETE,
    request,
    session,
    companyId,
    resourceType: "reference_data_file",
    resourceId: fileId,
    metadata: { fileName: deleted.fileName, chunkCount },
  });

  return NextResponse.json({ success: true, chunkCount });
}
