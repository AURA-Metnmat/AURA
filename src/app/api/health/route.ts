import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hasClaudeProvider, hasOpenAIProvider } from "@/lib/ai/providers";

export async function GET() {
  try {
    env();
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      platform: env().platformName,
      ai: {
        primary: hasClaudeProvider() ? "claude" : hasOpenAIProvider() ? "openai" : "none",
        claude: hasClaudeProvider(),
        openai: hasOpenAIProvider(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
