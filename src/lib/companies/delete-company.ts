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
 * Deletes a company and all related data atomically.
 *
 * Uses the ARRAY form of $transaction (not the interactive callback form, which
 * fails with Supabase PgBouncer / P2028). Storage-file deletes are external and
 * run best-effort before the DB transaction. Slug-keyed tables are NOT covered
 * by the company-delete cascade, so they are deleted explicitly here — including
 * KnowledgeChunk, which was previously left behind and would leak a deleted
 * tenant's RAG corpus to any company that later reused the same slug.
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

  // All DB deletes run atomically in one transaction (array form is
  // PgBouncer-safe). deleteMany with an empty `in: []` is a safe no-op, so the
  // reference-file child deletes don't need a length guard.
  await db.$transaction([
    db.dataRecord.deleteMany({ where: { fileId: { in: referenceFileIds } } }),
    db.dataSheet.deleteMany({ where: { fileId: { in: referenceFileIds } } }),
    db.dataInsight.deleteMany({ where: { fileId: { in: referenceFileIds } } }),
    db.dataFile.deleteMany({ where: { companySlug: company.slug } }),
    db.furnaceSpec.deleteMany({ where: { companySlug: company.slug } }),
    db.pdfDocument.deleteMany({ where: { companySlug: company.slug } }),
    db.knowledgeChunk.deleteMany({ where: { companySlug: company.slug } }),
    db.employeeOtp.deleteMany({ where: { companyId: company.id } }),
    // Cascades to interview sessions (and their children) and employees.
    db.company.delete({ where: { id: company.id } }),
  ]);

  return {
    companyName: company.name,
    sessions: company.sessions.length,
    referenceFiles: referenceFiles.length,
    storageFiles: storageKeys.length,
  };
}
