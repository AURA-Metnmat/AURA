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

/**
 * Deletes a company and all related data without interactive transactions.
 * Interactive $transaction callbacks fail with Supabase PgBouncer (P2028).
 */
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

  const referenceFiles = await db.dataFile.findMany({
    where: { companySlug: company.slug },
    select: { id: true },
  });
  const referenceFileIds = referenceFiles.map((f) => f.id);

  if (referenceFileIds.length > 0) {
    await db.dataRecord.deleteMany({ where: { fileId: { in: referenceFileIds } } });
    await db.dataSheet.deleteMany({ where: { fileId: { in: referenceFileIds } } });
    await db.dataInsight.deleteMany({ where: { fileId: { in: referenceFileIds } } });
  }

  await db.dataFile.deleteMany({ where: { companySlug: company.slug } });
  await db.furnaceSpec.deleteMany({ where: { companySlug: company.slug } });
  await db.pdfDocument.deleteMany({ where: { companySlug: company.slug } });
  await db.employeeOtp.deleteMany({ where: { companyId: company.id } });

  // Company delete cascades to interview sessions (and their children) and employees.
  await db.company.delete({ where: { id: company.id } });

  return {
    companyName: company.name,
    sessions: company.sessions.length,
    referenceFiles: referenceFiles.length,
    storageFiles: storageKeys.length,
  };
}
