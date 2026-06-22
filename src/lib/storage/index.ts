import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export interface StoredFile {
  filePath: string;
  storageKey: string;
}

function getSupabaseAdmin() {
  const { storage } = env();
  if (!storage.supabaseUrl || !storage.supabaseServiceKey || !storage.bucket) {
    throw new Error(
      "Supabase storage is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET."
    );
  }
  return createClient(storage.supabaseUrl, storage.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Opaque path stored in DB — not a public URL. */
function buildPrivatePath(storageKey: string): string {
  return `storage://${storageKey}`;
}

export async function createSignedStorageUrl(
  storageKey: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!storageKey?.trim()) return null;
  const { storage } = env();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(storage.bucket!)
    .createSignedUrl(storageKey, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function storeInterviewFile(
  sessionId: string,
  fileName: string,
  fileType: string,
  buffer: Buffer
): Promise<StoredFile> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}-${safeName}`;
  const key = `interviews/${sessionId}/${uniqueName}`;

  const { storage } = env();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(storage.bucket!).upload(key, buffer, {
    contentType: fileType || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  return { filePath: buildPrivatePath(key), storageKey: key };
}

export async function resolveAttachmentDownloadUrl(
  storageKey: string | null | undefined,
  legacyFilePath?: string | null
): Promise<string | null> {
  if (storageKey) {
    return createSignedStorageUrl(storageKey, 3600);
  }
  if (legacyFilePath?.startsWith("http")) {
    return legacyFilePath;
  }
  return null;
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  const { storage } = env();
  const supabase = getSupabaseAdmin();
  await supabase.storage.from(storage.bucket!).remove([storageKey]);
}
