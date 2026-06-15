/**
 * Production environment — Supabase Postgres + Supabase Storage + Vercel.
 */

export type AppEnv = {
  nodeEnv: string;
  isProduction: boolean;
  databaseUrl: string;
  openaiApiKey: string;
  platformName: string;
  appUrl: string;
  adminPassword: string;
  sessionSecret: string;
  storage: {
    supabaseUrl: string;
    supabaseServiceKey: string;
    bucket: string;
  };
  importDataDir: string | null;
};

function missing(name: string): never {
  throw new Error(`Missing required environment variable: ${name}`);
}

function require(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) missing(name);
  return value!;
}

export function getAppEnv(): AppEnv {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const isProduction = nodeEnv === "production";

  const databaseUrl = require("DATABASE_URL");
  const openaiApiKey = require("OPENAI_API_KEY");
  const adminPassword = require("ADMIN_PASSWORD");
  const sessionSecret = require("SESSION_SECRET");
  const supabaseUrl = require("SUPABASE_URL").replace(/\/$/, "");
  const supabaseServiceKey = require("SUPABASE_SERVICE_ROLE_KEY");
  const bucket = require("SUPABASE_STORAGE_BUCKET");

  if (openaiApiKey === "your-openai-api-key-here") {
    missing("OPENAI_API_KEY");
  }
  if (adminPassword.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  }
  if (sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? missing("NEXT_PUBLIC_APP_URL");

  if (isProduction && appUrl.includes("localhost")) {
    console.warn("[env] NEXT_PUBLIC_APP_URL points to localhost in production");
  }

  return {
    nodeEnv,
    isProduction,
    databaseUrl,
    openaiApiKey,
    platformName: process.env.PLATFORM_NAME?.trim() || "AURA-METNMAT",
    appUrl,
    adminPassword,
    sessionSecret,
    storage: { supabaseUrl, supabaseServiceKey, bucket },
    importDataDir: process.env.IMPORT_DATA_DIR?.trim() ?? null,
  };
}

let cached: AppEnv | null = null;

export function env(): AppEnv {
  if (!cached) cached = getAppEnv();
  return cached;
}

export function resetEnvCache(): void {
  cached = null;
}
