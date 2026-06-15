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

function buildPublicUrl(key: string): string {
  const { storage } = env();
  return `${storage.supabaseUrl}/storage/v1/object/public/${storage.bucket}/${key}`;
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

  return { filePath: buildPublicUrl(key), storageKey: key };
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  const { storage } = env();
  const supabase = getSupabaseAdmin();
  await supabase.storage.from(storage.bucket!).remove([storageKey]);
}
