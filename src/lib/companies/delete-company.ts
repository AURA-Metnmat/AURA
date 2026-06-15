import { db } from "@/lib/db";
import { deleteStoredFile } from "@/lib/storage";

export type DeleteCompanySummary = {
  companyName: string;
  sessions: number;
  referenceFiles: number;
  storageFiles: number;
};

export async function getDeleteCompanySummary(companyId: string): Promise<DeleteCompanySummary | null> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      name: true,
      slug: true,
      _count: { select: { sessions: true } },
      sessions: {
        select: {
          attachments: { select: { storageKey: true } },
        },
      },
    },
  });

  if (!company) return null;

  const storageFiles = company.sessions
    .flatMap((s) => s.attachments)
    .filter((a) => a.storageKey).length;

  const referenceFiles = await db.dataFile.count({ where: { companySlug: company.slug } });

  return {
    companyName: company.name,
    sessions: company._count.sessions,
    referenceFiles,
    storageFiles,
  };
}

export async function deleteCompanyCompletely(companyId: string): Promise<DeleteCompanySummary> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      sessions: {
        include: {
          attachments: { select: { storageKey: true } },
        },
      },
    },
  });

  if (!company) {
    throw new Error("Company not found");
  }

  const storageKeys = [
    ...new Set(
      company.sessions
        .flatMap((s) => s.attachments)
        .map((a) => a.storageKey)
        .filter((key): key is string => Boolean(key))
    ),
  ];

  for (const key of storageKeys) {
    try {
      await deleteStoredFile(key);
    } catch (error) {
      console.error(`Failed to delete storage file ${key}:`, error);
    }
  }

  const summary: DeleteCompanySummary = {
    companyName: company.name,
    sessions: company.sessions.length,
    referenceFiles: 0,
    storageFiles: storageKeys.length,
  };

  await db.$transaction(async (tx) => {
    const referenceFiles = await tx.dataFile.findMany({
      where: { companySlug: company.slug },
      select: { id: true },
    });
    summary.referenceFiles = referenceFiles.length;

    for (const file of referenceFiles) {
      await tx.dataRecord.deleteMany({ where: { fileId: file.id } });
      await tx.dataSheet.deleteMany({ where: { fileId: file.id } });
      await tx.dataInsight.deleteMany({ where: { fileId: file.id } });
    }

    await tx.dataFile.deleteMany({ where: { companySlug: company.slug } });
    await tx.furnaceSpec.deleteMany({ where: { companySlug: company.slug } });
    await tx.pdfDocument.deleteMany({ where: { companySlug: company.slug } });
    await tx.interviewSession.deleteMany({ where: { companyId: company.id } });
    await tx.company.delete({ where: { id: company.id } });
  });

  return summary;
}
