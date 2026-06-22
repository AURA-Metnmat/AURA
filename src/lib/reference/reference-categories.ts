export const REFERENCE_FILE_CATEGORIES = [
  { id: "general", label: "General" },
  { id: "process", label: "Process & Workflow" },
  { id: "equipment", label: "Equipment & Operations" },
  { id: "furnace", label: "Furnace / Plant" },
  { id: "metal_analysis", label: "Metal Analysis" },
  { id: "raw_materials", label: "Raw Materials" },
  { id: "quality", label: "Quality & Standards" },
  { id: "safety", label: "Safety & Compliance" },
  { id: "integration", label: "Systems & Integration" },
  { id: "reporting", label: "Reporting & KPIs" },
] as const;

export type ReferenceFileCategory = (typeof REFERENCE_FILE_CATEGORIES)[number]["id"];

const CATEGORY_SET = new Set<string>(REFERENCE_FILE_CATEGORIES.map((c) => c.id));

export function isReferenceFileCategory(value: string): value is ReferenceFileCategory {
  return CATEGORY_SET.has(value);
}

export function normalizeReferenceCategory(value: string | undefined | null): ReferenceFileCategory {
  if (value && isReferenceFileCategory(value)) return value;
  return "general";
}

export const REFERENCE_UPLOAD_EXTENSIONS = [
  ".xlsx",
  ".xls",
  ".csv",
  ".pdf",
  ".txt",
  ".md",
] as const;

export const REFERENCE_UPLOAD_ACCEPT = REFERENCE_UPLOAD_EXTENSIONS.join(",");

export const MAX_REFERENCE_UPLOAD_BYTES = 25 * 1024 * 1024;

export function isAllowedReferenceUpload(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return REFERENCE_UPLOAD_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
