import { db } from "@/lib/db";
import { parsePhase2QuestionFile } from "./phase2-parser";

export async function replacePhase2QuestionsFromFile(
  companyId: string,
  fileName: string,
  buffer: Buffer
): Promise<number> {
  const parsed = await parsePhase2QuestionFile(buffer, fileName);
  if (parsed.length === 0) {
    throw new Error("No questions found in file. Add one question per line or use Excel with a Question column.");
  }

  await db.$transaction(async (tx) => {
    await tx.fixedPhaseQuestion.deleteMany({ where: { companyId } });
    await tx.fixedPhaseQuestion.createMany({
      data: parsed.map((q, index) => ({
        companyId,
        sortOrder: index,
        promptEn: q.promptEn,
        questionType: q.questionType,
        optionsJson: q.optionsJson,
        interactionJson: q.interactionJson,
        section: q.section,
        sourceFile: fileName,
        isActive: true,
      })),
    });
  });

  return parsed.length;
}

export async function listPhase2Questions(companyId: string) {
  return db.fixedPhaseQuestion.findMany({
    where: { companyId },
    orderBy: { sortOrder: "asc" },
  });
}
