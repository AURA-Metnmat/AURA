import {
  isAllowedReferenceUpload,
  MAX_REFERENCE_UPLOAD_BYTES,
  sanitizeReferenceFileName,
} from "@/lib/reference/reference-categories";
import { parseFormDataUploads, type ParsedFormUpload } from "./form-data-files";

/** Vercel serverless request body limit is ~4.5MB — use JSON below this raw size */
export const JSON_REFERENCE_UPLOAD_MAX_BYTES = 3 * 1024 * 1024;

export interface JsonReferenceUploadFile {
  fileName: string;
  contentBase64: string;
}

function decodeBase64Payload(contentBase64: string): Buffer | null {
  const trimmed = contentBase64.trim();
  if (!trimmed) return null;

  const payload = trimmed.includes(",") ? (trimmed.split(",").pop() ?? "") : trimmed;
  if (!payload) return null;

  try {
    const buffer = Buffer.from(payload, "base64");
    return buffer.length > 0 ? buffer : null;
  } catch {
    return null;
  }
}

export function parseJsonReferenceUploads(files: JsonReferenceUploadFile[]): ParsedFormUpload[] {
  const uploads: ParsedFormUpload[] = [];

  for (const file of files) {
    const fileName = sanitizeReferenceFileName(file.fileName ?? "");
    if (!fileName || !isAllowedReferenceUpload(fileName)) continue;

    const buffer = decodeBase64Payload(file.contentBase64 ?? "");
    if (!buffer) continue;

    uploads.push({ fileName, buffer, size: buffer.length });
  }

  return uploads;
}

export async function parseReferenceUploadRequest(request: Request): Promise<ParsedFormUpload[]> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { files?: JsonReferenceUploadFile[] };
    return parseJsonReferenceUploads(Array.isArray(body.files) ? body.files : []);
  }

  const formData = await request.formData();
  const parsed = await parseFormDataUploads(formData);
  return parsed
    .map((entry) => ({
      ...entry,
      fileName: sanitizeReferenceFileName(entry.fileName),
    }))
    .filter((entry) => entry.fileName && entry.buffer.length > 0);
}

export function validateReferenceUploads(
  parsed: ParsedFormUpload[]
): { ok: true; uploads: ParsedFormUpload[] } | { ok: false; error: string } {
  if (parsed.length === 0) {
    return {
      ok: false,
      error:
        "No valid files received. Choose a file up to 25MB with content. If the file is on OneDrive, download it to your computer first, then upload.",
    };
  }

  const uploads: ParsedFormUpload[] = [];

  for (const entry of parsed) {
    const fileName = sanitizeReferenceFileName(entry.fileName);
    if (!fileName || !isAllowedReferenceUpload(fileName)) {
      return { ok: false, error: "Invalid file name." };
    }

    if (entry.size > MAX_REFERENCE_UPLOAD_BYTES) {
      return {
        ok: false,
        error: `File "${fileName}" exceeds ${Math.round(MAX_REFERENCE_UPLOAD_BYTES / (1024 * 1024))}MB limit`,
      };
    }
    if (entry.buffer.length === 0) {
      return {
        ok: false,
        error: `File "${fileName}" is empty. Save or download the file locally, then try again.`,
      };
    }
    uploads.push({ ...entry, fileName });
  }

  return { ok: true, uploads };
}
