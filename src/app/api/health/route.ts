import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hasClaudeProvider, hasOpenAIProvider } from "@/lib/ai/providers";

export async function GET() {
  const started = Date.now();
  try {
    env();
    await db.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - started;
    const claude = hasClaudeProvider();
    const openai = hasOpenAIProvider();

    return NextResponse.json({
      status: dbLatencyMs > 3000 ? "degraded" : "ok",
      platform: env().platformName,
      dbLatencyMs,
      ai: {
        primary: claude ? "claude" : openai ? "openai" : "none",
        claude,
        openai,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "error", dbLatencyMs: Date.now() - started },
      { status: 503 }
    );
  }
}
