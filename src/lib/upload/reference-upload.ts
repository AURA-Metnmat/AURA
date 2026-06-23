import {
  isAllowedReferenceUpload,
  MAX_REFERENCE_UPLOAD_BYTES,
  resolveReferenceFileName,
} from "@/lib/reference/reference-categories";
import { parseFormDataUploads, type ParsedFormUpload } from "./form-data-files";

/** Vercel serverless request body limit is ~4.5MB — keep JSON payloads under this */
export const JSON_REFERENCE_UPLOAD_MAX_BYTES = 3 * 1024 * 1024;

export interface JsonReferenceUploadFile {
  fileName: string;
  contentBase64: string;
  mimeType?: string;
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

  files.forEach((file, index) => {
    const buffer = decodeBase64Payload(file.contentBase64 ?? "");
    if (!buffer) return;

    const fileName = resolveReferenceFileName(
      file.fileName ?? "",
      index,
      file.mimeType ?? null
    );
    if (!isAllowedReferenceUpload(fileName)) return;

    uploads.push({ fileName, buffer, size: buffer.length });
  });

  return uploads;
}

export async function parseReferenceFormData(formData: FormData): Promise<ParsedFormUpload[]> {
  const parsed = await parseFormDataUploads(formData, ["files", "file"]);
  const uploads: ParsedFormUpload[] = [];

  parsed.forEach((entry, index) => {
    if (entry.buffer.length === 0) return;

    const fileName = resolveReferenceFileName(entry.fileName, index);
    if (!isAllowedReferenceUpload(fileName)) return;

    uploads.push({
      fileName,
      buffer: entry.buffer,
      size: entry.buffer.length,
    });
  });

  return uploads;
}

export async function parseReferenceUploadRequest(request: Request): Promise<ParsedFormUpload[]> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { files?: JsonReferenceUploadFile[] };
    return parseJsonReferenceUploads(Array.isArray(body.files) ? body.files : []);
  }

  const formData = await request.formData();
  return parseReferenceFormData(formData);
}

export function validateReferenceUploads(
  parsed: ParsedFormUpload[]
): { ok: true; uploads: ParsedFormUpload[] } | { ok: false; error: string } {
  if (parsed.length === 0) {
    return {
      ok: false,
      error:
        "No valid files received. The file may be empty, unreadable, or still on OneDrive — download it to your computer first, then upload again. Any file type up to 25MB is supported.",
    };
  }

  const uploads: ParsedFormUpload[] = [];

  for (const entry of parsed) {
    const fileName = resolveReferenceFileName(entry.fileName, uploads.length);
    if (!isAllowedReferenceUpload(fileName)) {
      return { ok: false, error: `Invalid file name: ${entry.fileName}` };
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
