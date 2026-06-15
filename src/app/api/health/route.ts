import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export async function GET() {
  try {
    env();
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      platform: env().platformName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ status: "error", error: message }, { status: 503 });
  }
}
