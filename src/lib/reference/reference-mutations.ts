import { db } from "@/lib/db";
import { reindexCompanyKnowledge } from "@/lib/knowledge/indexer";
import { normalizeReferenceCategory } from "./reference-categories";

export async function syncReferenceKnowledgeIndex(
  companySlug: string,
  companyId: string
): Promise<number> {
  const result = await reindexCompanyKnowledge({
    companySlug,
    companyId,
    scope: "reference",
  });
  return result.reference;
}

export async function deleteReferenceDataFile(
  companySlug: string,
  fileId: string
): Promise<{ fileName: string } | null> {
  const file = await db.dataFile.findFirst({
    where: { id: fileId, companySlug },
    select: { id: true, fileName: true },
  });
  if (!file) return null;

  await db.furnaceSpec.deleteMany({
    where: { companySlug, sourceFile: file.fileName },
  });
  await db.dataFile.delete({ where: { id: file.id } });

  return { fileName: file.fileName };
}

export async function deleteReferenceDocument(
  companySlug: string,
  documentId: string
): Promise<{ fileName: string } | null> {
  const doc = await db.pdfDocument.findFirst({
    where: { id: documentId, companySlug },
    select: { id: true, fileName: true },
  });
  if (!doc) return null;

  await db.pdfDocument.delete({ where: { id: doc.id } });
  return { fileName: doc.fileName };
}

export async function updateReferenceDataFile(
  companySlug: string,
  fileId: string,
  data: {
    fileName?: string;
    description?: string | null;
    category?: string;
  }
): Promise<{ id: string; fileName: string } | null> {
  const existing = await db.dataFile.findFirst({
    where: { id: fileId, companySlug },
    select: { id: true, fileName: true },
  });
  if (!existing) return null;

  const fileName = data.fileName?.trim();
  if (fileName !== undefined && !fileName) {
    throw new Error("File name cannot be empty");
  }

  const updated = await db.dataFile.update({
    where: { id: fileId },
    data: {
      ...(fileName !== undefined ? { fileName } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.category !== undefined
        ? { category: normalizeReferenceCategory(data.category) }
        : {}),
    },
    select: { id: true, fileName: true },
  });

  if (fileName && fileName !== existing.fileName) {
    await db.furnaceSpec.updateMany({
      where: { companySlug, sourceFile: existing.fileName },
      data: { sourceFile: fileName },
    });
  }

  return updated;
}

export async function updateReferenceDocument(
  companySlug: string,
  documentId: string,
  data: {
    fileName?: string;
    content?: string;
    summary?: string | null;
  }
): Promise<{ id: string; fileName: string } | null> {
  const existing = await db.pdfDocument.findFirst({
    where: { id: documentId, companySlug },
    select: { id: true },
  });
  if (!existing) return null;

  const fileName = data.fileName?.trim();
  if (fileName !== undefined && !fileName) {
    throw new Error("File name cannot be empty");
  }

  const content = data.content;
  if (content !== undefined && content.trim().length < 1) {
    throw new Error("Document content cannot be empty");
  }

  return db.pdfDocument.update({
    where: { id: documentId },
    data: {
      ...(fileName !== undefined ? { fileName } : {}),
      ...(content !== undefined ? { content: content.trim() } : {}),
      ...(data.summary !== undefined ? { summary: data.summary?.trim() || null } : {}),
      ...(content !== undefined && data.summary === undefined
        ? {
            summary: content.trim().slice(0, 500).replace(/\s+/g, " ").trim(),
          }
        : {}),
    },
    select: { id: true, fileName: true },
  });
}

export async function getReferenceDocumentForEdit(
  companySlug: string,
  documentId: string
) {
  return db.pdfDocument.findFirst({
    where: { id: documentId, companySlug },
    select: {
      id: true,
      fileName: true,
      pageCount: true,
      content: true,
      summary: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getReferenceDataFileForEdit(companySlug: string, fileId: string) {
  return db.dataFile.findFirst({
    where: { id: fileId, companySlug },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      category: true,
      fileSize: true,
      sheetCount: true,
      rowCount: true,
      description: true,
      importedAt: true,
      updatedAt: true,
    },
  });
}
