import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { parseInteraction } from "@/lib/aura/interaction";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id: companyId } = await params;

  const questions = await db.questionBank.findMany({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
    include: {
      versions: {
        where: { isCurrent: true },
        take: 1,
      },
      _count: { select: { campaigns: true } },
    },
  });

  return NextResponse.json({
    questions: questions.map((q) => {
      const current = q.versions[0];
      return {
        id: q.id,
        title: q.title,
        section: q.section,
        category: q.category,
        isActive: q.isActive,
        campaignUsageCount: q._count.campaigns,
        currentVersion: current
          ? {
              id: current.id,
              version: current.version,
              promptEn: current.promptEn,
              promptLocale: current.promptLocale,
              section: current.section,
              interaction: parseInteraction(current.interactionJson),
            }
          : null,
        updatedAt: q.updatedAt.toISOString(),
      };
    }),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id: companyId } = await params;
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    title?: string;
    section?: string | null;
    category?: string | null;
    promptEn?: string;
    promptLocale?: string | null;
    interaction?: Record<string, unknown> | null;
  };

  if (!body.title?.trim() || !body.promptEn?.trim()) {
    return NextResponse.json(
      { error: "title and promptEn are required" },
      { status: 400 }
    );
  }

  const interactionJson =
    body.interaction && typeof body.interaction === "object"
      ? JSON.stringify(body.interaction)
      : null;

  const bank = await db.questionBank.create({
    data: {
      companyId,
      title: body.title.trim(),
      section: body.section?.trim() || null,
      category: body.category?.trim() || null,
      versions: {
        create: {
          version: 1,
          promptEn: body.promptEn.trim(),
          promptLocale: body.promptLocale?.trim() || null,
          interactionJson,
          section: body.section?.trim() || null,
          isCurrent: true,
        },
      },
    },
    include: { versions: { where: { isCurrent: true }, take: 1 } },
  });

  const version = bank.versions[0]!;

  return NextResponse.json(
    {
      question: {
        id: bank.id,
        title: bank.title,
        section: bank.section,
        category: bank.category,
        currentVersion: {
          id: version.id,
          version: version.version,
          promptEn: version.promptEn,
          promptLocale: version.promptLocale,
          section: version.section,
          interaction: parseInteraction(version.interactionJson),
        },
      },
    },
    { status: 201 }
  );
}
