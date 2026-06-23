import {
  isAllowedReferenceUpload,
  MAX_REFERENCE_UPLOAD_BYTES,
} from "@/lib/reference/reference-categories";
import { parseFormDataUploads, type ParsedFormUpload } from "./form-data-files";

/** Vercel serverless request body limit is ~4.5MB — use JSON below this raw size */
export const JSON_REFERENCE_UPLOAD_MAX_BYTES = 3 * 1024 * 1024;

export interface JsonReferenceUploadFile {
  fileName: string;
  contentBase64: string;
}

export function parseJsonReferenceUploads(files: JsonReferenceUploadFile[]): ParsedFormUpload[] {
  const uploads: ParsedFormUpload[] = [];

  for (const file of files) {
    const fileName = file.fileName?.trim();
    if (!fileName) continue;

    const contentBase64 = file.contentBase64?.trim();
    if (!contentBase64) continue;

    let buffer: Buffer;
    try {
      buffer = Buffer.from(contentBase64, "base64");
    } catch {
      continue;
    }

    if (buffer.length === 0) continue;
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
  return parseFormDataUploads(formData);
}

export function validateReferenceUploads(
  parsed: ParsedFormUpload[]
): { ok: true; uploads: ParsedFormUpload[] } | { ok: false; error: string } {
  if (parsed.length === 0) {
    return {
      ok: false,
      error:
        "No valid files received. Use Excel (.xlsx/.xls), CSV, PDF, TXT, or Markdown under 25MB. If the file is on OneDrive, download it to your computer first, then upload.",
    };
  }

  const uploads: ParsedFormUpload[] = [];

  for (const entry of parsed) {
    if (entry.size > MAX_REFERENCE_UPLOAD_BYTES) {
      return {
        ok: false,
        error: `File "${entry.fileName}" exceeds ${Math.round(MAX_REFERENCE_UPLOAD_BYTES / (1024 * 1024))}MB limit`,
      };
    }
    if (!isAllowedReferenceUpload(entry.fileName)) {
      return {
        ok: false,
        error: `Unsupported file type: ${entry.fileName}. Use Excel, CSV, PDF, TXT, or Markdown.`,
      };
    }
    if (entry.buffer.length === 0) {
      return {
        ok: false,
        error: `File "${entry.fileName}" is empty. Save or download the file locally, then try again.`,
      };
    }
    uploads.push(entry);
  }

  return { ok: true, uploads };
}
