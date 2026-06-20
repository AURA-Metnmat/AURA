import { getCompanyDocumentContext as loadDocumentContext } from "@/lib/ai/knowledge-retrieval";

export async function getCompanyDocumentContext(companySlug: string): Promise<string> {
  return loadDocumentContext(companySlug);
}

export async function loadFullCompanyContext(company: {
  name: string;
  industry?: string | null;
  description?: string | null;
  aiContext?: string | null;
  slug: string;
}) {
  const documentContext = await loadDocumentContext(company.slug);
  return {
    name: company.name,
    slug: company.slug,
    industry: company.industry,
    description: company.description,
    aiContext: company.aiContext,
    documentContext: documentContext || null,
  };
}
