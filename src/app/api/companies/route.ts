import { NextResponse } from "next/server";
import { Prisma } from "@/generated/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { generateInviteToken, getInterviewLink, slugifyCompanyName } from "@/lib/aura/company-utils";
import { ensureDefaultCampaign } from "@/lib/campaigns/resolve";

async function resolveUniqueSlug(baseSlug: string): Promise<string> {
  if (!baseSlug) return baseSlug;

  let slug = baseSlug;
  let suffix = 2;

  while (await db.company.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const companies = await db.company.findMany({
    where: {
      ...(category ? { category } : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { sessions: true } },
      sessions: {
        where: { status: "completed" },
        select: { id: true },
      },
    },
  });

  const result = companies.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    category: c.category,
    industry: c.industry,
    description: c.description,
    inviteToken: c.inviteToken,
    contactName: c.contactName,
    contactEmail: c.contactEmail,
    contactPhone: c.contactPhone,
    location: c.location,
    aiContext: c.aiContext,
    interviewDurationMinutes: c.interviewDurationMinutes,
    isActive: c.isActive,
    createdAt: c.createdAt,
    sessionCount: c._count.sessions,
    completedCount: c.sessions?.length ?? 0,
    interviewLink: getInterviewLink(c.inviteToken, request),
  }));

  const categories = [...new Set(companies.map((c) => c.category).filter(Boolean))] as string[];
  return NextResponse.json({ companies: result, categories });
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      name: string;
      slug?: string;
      category?: string;
      industry?: string;
      description?: string;
      aiContext?: string;
      interviewDurationMinutes?: number;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      location?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Company name required" }, { status: 400 });
    }

    const baseSlug =
      body.slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") ||
      slugifyCompanyName(body.name);

    if (!baseSlug) {
      return NextResponse.json({ error: "Company name must contain letters or numbers" }, { status: 400 });
    }

    const slug = await resolveUniqueSlug(baseSlug);

    const inviteToken = generateInviteToken();

    const company = await db.company.create({
      data: {
        name: body.name.trim(),
        slug,
        inviteToken,
        category: body.category?.trim() || "Other",
        industry: body.industry?.trim() || null,
        description: body.description?.trim() || null,
        aiContext: body.aiContext?.trim() || null,
        interviewDurationMinutes:
          typeof body.interviewDurationMinutes === "number" && body.interviewDurationMinutes > 0
            ? Math.min(60, Math.max(5, Math.round(body.interviewDurationMinutes)))
            : 5,
        contactName: body.contactName?.trim() || null,
        contactEmail: body.contactEmail?.trim() || null,
        contactPhone: body.contactPhone?.trim() || null,
        location: body.location?.trim() || null,
      },
    });

    await ensureDefaultCampaign(company.id, company.inviteToken);

    const interviewLink = getInterviewLink(company.inviteToken, request);

    return NextResponse.json(
      {
        company: { ...company, interviewLink },
        interviewLink,
        message: "Company onboarded. Share the interview link with client employees.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create company error:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A company with this identifier already exists. Try a different name." },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Failed to create company. Please try again." }, { status: 500 });
  }
}
