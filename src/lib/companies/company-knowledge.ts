import { db } from "@/lib/db";

const MAX_DOC_CHARS = 12_000;

export async function getCompanyDocumentContext(companySlug: string): Promise<string> {
  const pdfs = await db.pdfDocument.findMany({
    where: { companySlug },
    select: { fileName: true, content: true, summary: true },
    orderBy: { createdAt: "asc" },
  });

  if (pdfs.length === 0) return "";

  const combined = pdfs
    .map((doc) => {
      const body = (doc.content || doc.summary || "").trim();
      return `### ${doc.fileName}\n${body}`;
    })
    .join("\n\n");

  return combined.length > MAX_DOC_CHARS
    ? `${combined.slice(0, MAX_DOC_CHARS)}\n\n[Document text truncated for context window]`
    : combined;
}

export async function loadFullCompanyContext(company: {
  name: string;
  industry?: string | null;
  description?: string | null;
  aiContext?: string | null;
  slug: string;
}) {
  const documentContext = await getCompanyDocumentContext(company.slug);
  return {
    name: company.name,
    industry: company.industry,
    description: company.description,
    aiContext: company.aiContext,
    documentContext: documentContext || null,
  };
}
