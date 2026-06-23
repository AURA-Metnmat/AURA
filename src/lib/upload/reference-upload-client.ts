import {
  MAX_REFERENCE_UPLOAD_BYTES,
  resolveReferenceFileName,
} from "@/lib/reference/reference-categories";
import { JSON_REFERENCE_UPLOAD_MAX_BYTES } from "./reference-upload";

export interface PreparedReferenceFile {
  fileName: string;
  buffer: ArrayBuffer;
  mimeType: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function estimateJsonPayloadBytes(prepared: PreparedReferenceFile[]): number {
  return prepared.reduce(
    (sum, file) =>
      sum + Math.ceil(file.buffer.byteLength * 4 / 3) + file.fileName.length + 64,
    256
  );
}

export async function prepareReferenceFiles(files: File[]): Promise<PreparedReferenceFile[]> {
  if (files.length === 0) {
    throw new Error("Choose at least one file to upload.");
  }

  const prepared: PreparedReferenceFile[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const displayName = file.name?.trim() || `file-${i + 1}`;

    if (file.size > MAX_REFERENCE_UPLOAD_BYTES) {
      throw new Error(`File "${displayName}" exceeds 25MB.`);
    }

    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch {
      throw new Error(
        `Could not read "${displayName}". Download it from OneDrive to your computer first, then upload.`
      );
    }

    if (buffer.byteLength === 0) {
      throw new Error(
        `File "${displayName}" has no readable content. If it is on OneDrive, download it locally first (cloud-only files cannot be uploaded from the browser).`
      );
    }

    if (buffer.byteLength > MAX_REFERENCE_UPLOAD_BYTES) {
      throw new Error(`File "${displayName}" exceeds 25MB.`);
    }

    prepared.push({
      fileName: resolveReferenceFileName(file.name, i, file.type),
      buffer,
      mimeType: file.type || "application/octet-stream",
    });
  }

  return prepared;
}

export async function buildReferenceUploadRequest(
  files: File[]
): Promise<{ init: RequestInit; mode: "json" | "multipart" }> {
  const prepared = await prepareReferenceFiles(files);
  const estimatedJsonBytes = estimateJsonPayloadBytes(prepared);
  const useJson =
    estimatedJsonBytes <= JSON_REFERENCE_UPLOAD_MAX_BYTES &&
    prepared.every((file) => file.buffer.byteLength <= JSON_REFERENCE_UPLOAD_MAX_BYTES);

  if (useJson) {
    const payload = {
      files: prepared.map((file) => ({
        fileName: file.fileName,
        mimeType: file.mimeType,
        contentBase64: arrayBufferToBase64(file.buffer),
      })),
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
  for (const file of prepared) {
    const blob = new Blob([file.buffer], { type: file.mimeType });
    formData.append("files", blob, file.fileName);
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
