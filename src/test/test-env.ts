import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resetEnvCache } from "@/lib/env";

function applyFallbackEnv(): void {
  process.env.ADMIN_PASSWORD ??= "integration-test-admin-password";
  process.env.SESSION_SECRET ??= "integration-test-session-secret-32chars!!";
  process.env.DATABASE_URL ??= "postgresql://localhost:5432/aura_test";
  process.env.DIRECT_URL ??= process.env.DATABASE_URL;
  process.env.OPENAI_API_KEY ??= "sk-integration-test-openai-key";
  process.env.SUPABASE_URL ??= "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= "integration-test-service-role-key";
  process.env.SUPABASE_STORAGE_BUCKET ??= "aura-uploads";
}

const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

applyFallbackEnv();
resetEnvCache();
