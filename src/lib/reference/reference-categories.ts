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

/** Accept any file in the file picker */
export const REFERENCE_UPLOAD_ACCEPT = "*/*";

export const MAX_REFERENCE_UPLOAD_BYTES = 25 * 1024 * 1024;

const UNSAFE_FILE_NAME = /[\\/]/;

export function sanitizeReferenceFileName(fileName: string): string {
  const base = fileName.trim().replace(/\\/g, "/").split("/").pop() ?? "";
  return base.replace(UNSAFE_FILE_NAME, "").slice(0, 255);
}

const MIME_EXTENSION_HINTS: Record<string, string> = {
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "text/markdown": ".md",
  "application/json": ".json",
  "application/xml": ".xml",
  "text/xml": ".xml",
  "text/html": ".html",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

function extensionFromMimeType(mimeType?: string | null): string {
  if (!mimeType) return "";
  const normalized = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  return MIME_EXTENSION_HINTS[normalized] ?? "";
}

/** Stable display name for uploads — never returns empty for a non-empty buffer */
export function resolveReferenceFileName(
  fileName: string,
  fallbackIndex: number,
  mimeType?: string | null
): string {
  const sanitized = sanitizeReferenceFileName(fileName);
  if (sanitized && isAllowedReferenceUpload(sanitized)) {
    return sanitized;
  }

  const ext = extensionFromMimeType(mimeType) || ".bin";
  const fallback = `reference-${fallbackIndex + 1}${ext}`;
  return sanitizeReferenceFileName(fallback) || `reference-${fallbackIndex + 1}.bin`;
}

/** Any non-empty safe filename — Excel/CSV get structured import; others are text-extracted */
export function isAllowedReferenceUpload(fileName: string): boolean {
  const name = sanitizeReferenceFileName(fileName);
  if (!name) return false;
  if (name.includes("..")) return false;
  if (name === "." || name === "..") return false;
  return true;
}

export function isStructuredReferenceDataFile(fileName: string): boolean {
  const lower = sanitizeReferenceFileName(fileName).toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv");
}
