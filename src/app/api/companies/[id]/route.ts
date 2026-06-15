import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { getInterviewLink } from "@/lib/aura/company-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;

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
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    category?: string;
    industry?: string;
    description?: string;
    aiContext?: string;
    isActive?: boolean;
  };

  const company = await db.company.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name.trim() }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.industry !== undefined && { industry: body.industry }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.aiContext !== undefined && { aiContext: body.aiContext }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  return NextResponse.json({
    company: {
      ...company,
      interviewLink: getInterviewLink(company.inviteToken, request),
    },
  });
}
