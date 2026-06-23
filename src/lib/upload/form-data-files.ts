export interface ParsedFormUpload {
  fileName: string;
  buffer: Buffer;
  size: number;
}

function fileNameFromEntry(entry: FormDataEntryValue, fallbackIndex: number): string | null {
  if (typeof entry === "string") return null;
  if (!entry || typeof entry !== "object") return null;

  const named = entry as Blob & { name?: string };
  if (typeof named.name === "string" && named.name.trim()) {
    return named.name.trim();
  }

  return `upload-${fallbackIndex + 1}.bin`;
}

/**
 * Parse multipart uploads from FormData. Avoids `instanceof File` which fails on
 * some Node/serverless runtimes and drops valid uploads as "No valid files uploaded".
 */
export async function parseFormDataUploads(
  formData: FormData,
  fieldNames: string[] = ["files", "file"]
): Promise<ParsedFormUpload[]> {
  const uploads: ParsedFormUpload[] = [];
  let index = 0;

  for (const fieldName of fieldNames) {
    for (const entry of formData.getAll(fieldName)) {
      if (typeof entry === "string") continue;
      if (!entry || typeof entry !== "object" || typeof entry.arrayBuffer !== "function") {
        continue;
      }

      const size = typeof entry.size === "number" ? entry.size : 0;
      if (size === 0) continue;

      const fileName = fileNameFromEntry(entry, index);
      if (!fileName) continue;

      const buffer = Buffer.from(await entry.arrayBuffer());
      if (buffer.length === 0) continue;

      uploads.push({ fileName, buffer, size: buffer.length });
      index++;
    }
  }

  return uploads;
}
