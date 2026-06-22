import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";
import {
  deleteReferenceDocument,
  getReferenceDocumentForEdit,
  syncReferenceKnowledgeIndex,
  updateReferenceDocument,
} from "@/lib/reference/reference-mutations";

async function resolveCompany(companyId: string) {
  return db.company.findUnique({
    where: { id: companyId },
    select: { id: true, slug: true },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id: companyId, documentId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.REVIEW_KNOWLEDGE);
  if (session instanceof NextResponse) return session;

  const company = await resolveCompany(companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const document = await getReferenceDocumentForEdit(company.slug, documentId);
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json({ document });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id: companyId, documentId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.REVIEW_KNOWLEDGE);
  if (session instanceof NextResponse) return session;

  const company = await resolveCompany(companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    fileName?: string;
    content?: string;
    summary?: string | null;
  };

  try {
    const updated = await updateReferenceDocument(company.slug, documentId, body);
    if (!updated) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const chunkCount = await syncReferenceKnowledgeIndex(company.slug, company.id);

    await logAdminAudit({
      action: AUDIT_ACTIONS.REFERENCE_UPDATE,
      request,
      session,
      companyId,
      resourceType: "reference_document",
      resourceId: documentId,
      metadata: { fileName: updated.fileName, chunkCount },
    });

    return NextResponse.json({ success: true, document: updated, chunkCount });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id: companyId, documentId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.REVIEW_KNOWLEDGE);
  if (session instanceof NextResponse) return session;

  const company = await resolveCompany(companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const deleted = await deleteReferenceDocument(company.slug, documentId);
  if (!deleted) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const chunkCount = await syncReferenceKnowledgeIndex(company.slug, company.id);

  await logAdminAudit({
    action: AUDIT_ACTIONS.REFERENCE_DELETE,
    request,
    session,
    companyId,
    resourceType: "reference_document",
    resourceId: documentId,
    metadata: { fileName: deleted.fileName, chunkCount },
  });

  return NextResponse.json({ success: true, chunkCount });
}
