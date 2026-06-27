import { NextResponse } from "next/server";
import { parseIntParam } from "@/lib/http/query-params";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { serializeInteraction } from "@/lib/aura/interaction";

export const dynamic = "force-dynamic";

const VALID_SECTIONS = new Set(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]);

function buildInteractionFromType(
  questionType: string,
  options: string[]
): string | null {
  const type = questionType.toLowerCase();
  if (type === "yes_no") {
    return serializeInteraction({ type: "yes_no" });
  }
  if (type === "mcq" && options.length >= 2) {
    return serializeInteraction({
      type: "mcq",
      options: options.slice(0, 8).map((label, i) => ({
        id: `opt_${i}`,
        en: label,
        locale: label,
      })),
    });
  }
  if (type === "rating") {
    return serializeInteraction({ type: "rating", min: 1, max: 5 });
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { id: companyId, questionId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.MANAGE_CAMPAIGNS);
  if (session instanceof NextResponse) return session;

  const existing = await db.fixedPhaseQuestion.findFirst({
    where: { id: questionId, companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const data: {
    promptEn?: string;
    promptLocale?: string | null;
    questionType?: string;
    optionsJson?: string | null;
    interactionJson?: string | null;
    section?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  } = {};

  if (typeof body.promptEn === "string") {
    const prompt = body.promptEn.trim();
    if (prompt.length < 3) {
      return NextResponse.json({ error: "Question text is too short" }, { status: 400 });
    }
    data.promptEn = prompt;
  }
  if (typeof body.promptLocale === "string") {
    data.promptLocale = body.promptLocale.trim() || null;
  }
  if (typeof body.section === "string") {
    const section = body.section.trim().toUpperCase();
    data.section = VALID_SECTIONS.has(section) ? section : null;
  }
  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }
  if (body.sortOrder !== undefined) {
    data.sortOrder = parseIntParam(body.sortOrder, 0, { min: 0 });
  }
  if (typeof body.questionType === "string") {
    data.questionType = body.questionType.trim().toLowerCase();
  }
  if (Array.isArray(body.options)) {
    const options = body.options.map((o) => String(o).trim()).filter(Boolean);
    data.optionsJson = options.length > 0 ? JSON.stringify(options) : null;
    data.interactionJson = buildInteractionFromType(
      data.questionType ?? existing.questionType,
      options
    );
  }

  const updated = await db.fixedPhaseQuestion.update({
    where: { id: questionId },
    data,
  });

  return NextResponse.json({ question: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { id: companyId, questionId } = await params;
  const session = await requireCompanyAdmin(request, companyId, PERMISSIONS.MANAGE_CAMPAIGNS);
  if (session instanceof NextResponse) return session;

  const existing = await db.fixedPhaseQuestion.findFirst({
    where: { id: questionId, companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  await db.fixedPhaseQuestion.delete({ where: { id: questionId } });

  const remaining = await db.fixedPhaseQuestion.findMany({
    where: { companyId },
    orderBy: { sortOrder: "asc" },
  });
  await db.$transaction(
    remaining.map((q, index) =>
      db.fixedPhaseQuestion.update({
        where: { id: q.id },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
