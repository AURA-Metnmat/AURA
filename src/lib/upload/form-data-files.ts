export interface ParsedFormUpload {
  fileName: string;
  buffer: Buffer;
  size: number;
}

const SKIP_FORM_FIELDS = new Set(["companySlug", "companyId", "action"]);

function fileNameFromEntry(
  entry: Blob & { name?: string },
  fieldName: string,
  fallbackIndex: number
): string {
  const name = typeof entry.name === "string" ? entry.name.trim() : "";
  if (name && name !== "blob") return name;

  const fromField = fieldName.replace(/\[\]$/, "");
  if (fromField && fromField !== "files" && fromField !== "file") {
    return `${fromField}-${fallbackIndex + 1}.bin`;
  }

  return `upload-${fallbackIndex + 1}.bin`;
}

async function readUploadEntry(
  entry: FormDataEntryValue,
  fieldName: string,
  fallbackIndex: number
): Promise<ParsedFormUpload | null> {
  if (typeof entry === "string") return null;
  if (!entry || typeof entry !== "object" || typeof entry.arrayBuffer !== "function") {
    return null;
  }

  const blob = entry as Blob & { name?: string };
  const buffer = Buffer.from(await blob.arrayBuffer());
  if (buffer.length === 0) return null;

  const fileName = fileNameFromEntry(blob, fieldName, fallbackIndex);
  return { fileName, buffer, size: buffer.length };
}

/**
 * Parse multipart uploads from FormData. Avoids `instanceof File` which fails on
 * some Node/serverless runtimes and drops valid uploads.
 */
export async function parseFormDataUploads(
  formData: FormData,
  fieldNames?: string[]
): Promise<ParsedFormUpload[]> {
  const uploads: ParsedFormUpload[] = [];
  const seen = new Set<string>();
  let index = 0;

  const pairs: Array<[string, FormDataEntryValue]> = [];

  if (fieldNames?.length) {
    for (const fieldName of fieldNames) {
      for (const entry of formData.getAll(fieldName)) {
        pairs.push([fieldName, entry]);
      }
    }
  } else {
    for (const [fieldName, entry] of formData.entries()) {
      if (SKIP_FORM_FIELDS.has(fieldName)) continue;
      pairs.push([fieldName, entry]);
    }
  }

  for (const [fieldName, entry] of pairs) {
    const parsed = await readUploadEntry(entry, fieldName, index);
    if (!parsed) continue;

    const dedupeKey = `${parsed.fileName}:${parsed.size}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    uploads.push(parsed);
    index++;
  }

  return uploads;
}
