import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { parseInteraction } from "@/lib/aura/interaction";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id: companyId, campaignId } = await params;

  const campaign = await db.interviewCampaign.findFirst({
    where: { id: campaignId, companyId },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const questions = await db.campaignQuestion.findMany({
    where: { campaignId },
    orderBy: { sortOrder: "asc" },
    include: {
      questionBank: { select: { id: true, title: true, section: true, category: true } },
      questionVersion: {
        select: {
          id: true,
          version: true,
          promptEn: true,
          promptLocale: true,
          interactionJson: true,
          section: true,
        },
      },
    },
  });

  return NextResponse.json({
    questions: questions.map((q) => ({
      id: q.id,
      sortOrder: q.sortOrder,
      section: q.section,
      questionBank: q.questionBank,
      version: {
        id: q.questionVersion.id,
        version: q.questionVersion.version,
        promptEn: q.questionVersion.promptEn,
        promptLocale: q.questionVersion.promptLocale,
        section: q.questionVersion.section,
        interaction: parseInteraction(q.questionVersion.interactionJson),
      },
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id: companyId, campaignId } = await params;
  const body = (await request.json()) as {
    questionBankId?: string;
    questionVersionId?: string;
    section?: string | null;
  };

  const campaign = await db.interviewCampaign.findFirst({
    where: { id: campaignId, companyId },
    include: { _count: { select: { questions: true } } },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!body.questionBankId) {
    return NextResponse.json({ error: "questionBankId is required" }, { status: 400 });
  }

  const bank = await db.questionBank.findFirst({
    where: { id: body.questionBankId, companyId },
    include: {
      versions: {
        where: body.questionVersionId
          ? { id: body.questionVersionId }
          : { isCurrent: true },
        take: 1,
      },
    },
  });

  if (!bank || bank.versions.length === 0) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const version = bank.versions[0]!;
  const sortOrder = campaign._count.questions;

  const link = await db.campaignQuestion.create({
    data: {
      campaignId,
      questionBankId: bank.id,
      questionVersionId: version.id,
      sortOrder,
      section: body.section?.trim() || version.section || bank.section || null,
    },
    include: {
      questionBank: { select: { id: true, title: true } },
      questionVersion: true,
    },
  });

  return NextResponse.json(
    {
      question: {
        id: link.id,
        sortOrder: link.sortOrder,
        section: link.section,
        questionBank: link.questionBank,
        version: {
          id: link.questionVersion.id,
          version: link.questionVersion.version,
          promptEn: link.questionVersion.promptEn,
        },
      },
    },
    { status: 201 }
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id: companyId, campaignId } = await params;
  const body = (await request.json()) as { orderedIds?: string[] };

  if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
    return NextResponse.json({ error: "orderedIds array is required" }, { status: 400 });
  }

  const campaign = await db.interviewCampaign.findFirst({
    where: { id: campaignId, companyId },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const links = await db.campaignQuestion.findMany({
    where: { campaignId, id: { in: body.orderedIds } },
  });

  if (links.length !== body.orderedIds.length) {
    return NextResponse.json({ error: "Invalid question order" }, { status: 400 });
  }

  await db.$transaction(
    body.orderedIds.map((id, index) =>
      db.campaignQuestion.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
