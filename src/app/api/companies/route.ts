import { NextResponse } from "next/server";
import { Prisma } from "@/generated/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { generateInviteToken, getInterviewLink, slugifyCompanyName } from "@/lib/aura/company-utils";

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
  const { searchParams } = new URL(request.url);
  const admin = searchParams.get("admin") === "true";
  const category = searchParams.get("category");

  if (admin) {
    const denied = await requireAdmin(request);
    if (denied) return denied;
  }

  const companies = await db.company.findMany({
    where: {
      ...(admin ? {} : { isActive: true }),
      ...(category ? { category } : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { sessions: true } },
      ...(admin
        ? {
            sessions: {
              where: { status: "completed" },
              select: { id: true },
            },
          }
        : {}),
    },
  });

  const result = companies.map((c) => {
    const item = {
      id: c.id,
      slug: c.slug,
      name: c.name,
      category: c.category,
      industry: c.industry,
      description: admin ? c.description : undefined,
    };

    if (admin) {
      return {
        ...item,
        inviteToken: c.inviteToken,
        contactName: c.contactName,
        contactEmail: c.contactEmail,
        contactPhone: c.contactPhone,
        location: c.location,
        aiContext: c.aiContext,
        isActive: c.isActive,
        createdAt: c.createdAt,
        sessionCount: c._count.sessions,
        completedCount: c.sessions?.length ?? 0,
        interviewLink: getInterviewLink(c.inviteToken, request),
      };
    }

    return item;
  });

  if (admin) {
    const categories = [...new Set(companies.map((c) => c.category).filter(Boolean))] as string[];
    return NextResponse.json({ companies: result, categories });
  }

  return NextResponse.json({ companies: result });
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
        contactName: body.contactName?.trim() || null,
        contactEmail: body.contactEmail?.trim() || null,
        contactPhone: body.contactPhone?.trim() || null,
        location: body.location?.trim() || null,
      },
    });

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
