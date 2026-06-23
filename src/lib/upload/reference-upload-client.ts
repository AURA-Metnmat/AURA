import {
  isAllowedReferenceUpload,
  MAX_REFERENCE_UPLOAD_BYTES,
} from "@/lib/reference/reference-categories";
import { JSON_REFERENCE_UPLOAD_MAX_BYTES } from "./reference-upload";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function validateClientReferenceFiles(files: File[]): string | null {
  for (const file of files) {
    if (!file.name.trim()) {
      return "Selected file has no name.";
    }
    if (!isAllowedReferenceUpload(file.name)) {
      return `Unsupported file type: ${file.name}. Use Excel, CSV, PDF, TXT, or Markdown.`;
    }
    if (file.size === 0) {
      return `File "${file.name}" is empty. If it is on OneDrive, download it locally first.`;
    }
    if (file.size > MAX_REFERENCE_UPLOAD_BYTES) {
      return `File "${file.name}" exceeds 25MB.`;
    }
  }
  return null;
}

export async function buildReferenceUploadRequest(
  files: File[]
): Promise<{ init: RequestInit; mode: "json" | "multipart" }> {
  const validationError = validateClientReferenceFiles(files);
  if (validationError) {
    throw new Error(validationError);
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const useJson = totalSize <= JSON_REFERENCE_UPLOAD_MAX_BYTES;

  if (useJson) {
    const payload = {
      files: await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          contentBase64: arrayBufferToBase64(await file.arrayBuffer()),
        }))
      ),
    };

    return {
      mode: "json",
      init: {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    };
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file, file.name);
  }

  return {
    mode: "multipart",
    init: {
      method: "POST",
      credentials: "include",
      body: formData,
    },
  };
}
