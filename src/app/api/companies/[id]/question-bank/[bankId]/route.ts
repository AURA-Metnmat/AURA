import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { parseInteraction } from "@/lib/aura/interaction";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; bankId: string }> }
) {
  const { id: companyId, bankId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.MANAGE_QUESTION_BANK);
  if (session instanceof NextResponse) return session;
  const body = (await request.json()) as {
    title?: string;
    section?: string | null;
    category?: string | null;
    isActive?: boolean;
    promptEn?: string;
    promptLocale?: string | null;
    interaction?: Record<string, unknown> | null;
    createNewVersion?: boolean;
  };

  const bank = await db.questionBank.findFirst({
    where: { id: bankId, companyId },
    include: { versions: { where: { isCurrent: true }, take: 1 } },
  });

  if (!bank) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const current = bank.versions[0];
  const contentChanged =
    body.promptEn !== undefined ||
    body.promptLocale !== undefined ||
    body.interaction !== undefined ||
    body.createNewVersion;

  await db.questionBank.update({
    where: { id: bankId },
    data: {
      ...(body.title?.trim() && { title: body.title.trim() }),
      ...(body.section !== undefined && { section: body.section?.trim() || null }),
      ...(body.category !== undefined && { category: body.category?.trim() || null }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  let version = current;

  if (contentChanged && body.promptEn?.trim()) {
    const interactionJson =
      body.interaction !== undefined
        ? body.interaction
          ? JSON.stringify(body.interaction)
          : null
        : current?.interactionJson ?? null;

    if (current && !body.createNewVersion) {
      version = await db.questionVersion.update({
        where: { id: current.id },
        data: {
          promptEn: body.promptEn.trim(),
          ...(body.promptLocale !== undefined && {
            promptLocale: body.promptLocale?.trim() || null,
          }),
          ...(body.interaction !== undefined && { interactionJson }),
          ...(body.section !== undefined && { section: body.section?.trim() || null }),
        },
      });
    } else {
      const nextVersion = (current?.version ?? 0) + 1;
      if (current) {
        await db.questionVersion.update({
          where: { id: current.id },
          data: { isCurrent: false },
        });
      }
      version = await db.questionVersion.create({
        data: {
          questionBankId: bankId,
          version: nextVersion,
          promptEn: body.promptEn.trim(),
          promptLocale: body.promptLocale?.trim() || current?.promptLocale || null,
          interactionJson:
            body.interaction !== undefined
              ? body.interaction
                ? JSON.stringify(body.interaction)
                : null
              : current?.interactionJson ?? null,
          section: body.section?.trim() || current?.section || bank.section || null,
          isCurrent: true,
        },
      });
    }
  }

  const updated = await db.questionBank.findUnique({
    where: { id: bankId },
    include: { versions: { where: { isCurrent: true }, take: 1 } },
  });

  const v = updated?.versions[0] ?? version;

  return NextResponse.json({
    question: {
      id: bankId,
      title: updated?.title ?? bank.title,
      section: updated?.section ?? bank.section,
      category: updated?.category ?? bank.category,
      isActive: updated?.isActive ?? bank.isActive,
      currentVersion: v
        ? {
            id: v.id,
            version: v.version,
            promptEn: v.promptEn,
            promptLocale: v.promptLocale,
            section: v.section,
            interaction: parseInteraction(v.interactionJson),
          }
        : null,
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; bankId: string }> }
) {
  const { id: companyId, bankId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.MANAGE_QUESTION_BANK);
  if (session instanceof NextResponse) return session;

  const bank = await db.questionBank.findFirst({
    where: { id: bankId, companyId },
    include: { _count: { select: { campaigns: true } } },
  });

  if (!bank) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  if (bank._count.campaigns > 0) {
    await db.questionBank.update({
      where: { id: bankId },
      data: { isActive: false },
    });
    return NextResponse.json({
      success: true,
      deactivated: true,
      message: "Question is used in campaigns and was deactivated instead of deleted.",
    });
  }

  await db.questionBank.delete({ where: { id: bankId } });

  return NextResponse.json({ success: true });
}
