import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/admin";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { generateInviteToken, getInterviewLink } from "@/lib/aura/company-utils";
import { ensureDefaultCampaign } from "@/lib/campaigns/resolve";
import {
  deleteCompanyCompletely,
  getDeleteCompanySummary,
} from "@/lib/companies/delete-company";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { AUDIT_ACTIONS, logAdminAudit } from "@/lib/auth/admin-audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const denied = await requireCompanyAdmin(request, id);
  if (denied instanceof NextResponse) return denied;

  const { searchParams } = new URL(request.url);

  if (searchParams.get("deletePreview") === "true") {
    const summary = await getDeleteCompanySummary(id);
    if (!summary) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    return NextResponse.json({ summary });
  }

  const company = await db.company.findUnique({
    where: { id },
    include: {
      _count: { select: { sessions: true } },
      sessions: {
        orderBy: { startedAt: "desc" },
        include: {
          participant: true,
          report: { select: { id: true, createdAt: true } },
        },
      },
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({
    company: {
      id: company.id,
      slug: company.slug,
      name: company.name,
      category: company.category,
      industry: company.industry,
      description: company.description,
      aiContext: company.aiContext,
      interviewDurationMinutes: company.interviewDurationMinutes,
      contactName: company.contactName,
      contactEmail: company.contactEmail,
      contactPhone: company.contactPhone,
      location: company.location,
      inviteToken: company.inviteToken,
      interviewLink: getInterviewLink(company.inviteToken, request),
      sessionCount: company._count.sessions,
      createdAt: company.createdAt,
    },
    sessions: company.sessions.map((s) => ({
      id: s.id,
      status: s.status,
      completionPct: s.completionPct,
      language: s.language,
      currentSection: s.currentSection,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      participant: s.participant,
      hasReport: !!s.report,
    })),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireCompanyAdmin(request, id);
  if (session instanceof NextResponse) return session;

  const body = (await request.json()) as {
    name?: string;
    category?: string;
    industry?: string;
    description?: string;
    aiContext?: string;
    interviewDurationMinutes?: number;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    location?: string;
    isActive?: boolean;
    regenerateInviteToken?: boolean;
  };

  const existing = await db.company.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const company = await db.company.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name.trim() }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.industry !== undefined && { industry: body.industry }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.aiContext !== undefined && { aiContext: body.aiContext }),
      ...(body.interviewDurationMinutes !== undefined && {
        interviewDurationMinutes: Math.min(
          60,
          Math.max(5, Math.round(body.interviewDurationMinutes))
        ),
      }),
      ...(body.contactName !== undefined && { contactName: body.contactName }),
      ...(body.contactEmail !== undefined && { contactEmail: body.contactEmail }),
      ...(body.contactPhone !== undefined && { contactPhone: body.contactPhone }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.regenerateInviteToken && { inviteToken: generateInviteToken() }),
    },
  });

  if (body.regenerateInviteToken) {
    await ensureDefaultCampaign(company.id, company.inviteToken);
  }

  await logAdminAudit({
    action: AUDIT_ACTIONS.COMPANY_UPDATE,
    request,
    session,
    companyId: company.id,
    resourceType: "company",
    resourceId: company.id,
    metadata: { regenerateInviteToken: !!body.regenerateInviteToken },
  });

  return NextResponse.json({
    company: {
      ...company,
      interviewLink: getInterviewLink(company.inviteToken, request),
    },
    ...(body.regenerateInviteToken
      ? { message: "Interview link regenerated. Previous links are now invalid." }
      : {}),
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireCompanyAdmin(request, id, PERMISSIONS.MANAGE_COMPANIES);
  if (session instanceof NextResponse) return session;

  try {
    const body = (await request.json().catch(() => ({}))) as { confirmName?: string };
    const summary = await getDeleteCompanySummary(id);

    if (!summary) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (body.confirmName?.trim() !== summary.companyName.trim()) {
      return NextResponse.json(
        { error: "Confirmation name does not match company name" },
        { status: 400 }
      );
    }

    const deleted = await deleteCompanyCompletely(id);

    await logAdminAudit({
      action: AUDIT_ACTIONS.COMPANY_DELETE,
      request,
      session,
      companyId: id,
      resourceType: "company",
      resourceId: id,
      metadata: { companyName: deleted.companyName },
    });

    return NextResponse.json({
      success: true,
      message: `${deleted.companyName} and all related data were permanently deleted.`,
      deleted,
    });
  } catch (error) {
    console.error("Delete company error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete company. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
