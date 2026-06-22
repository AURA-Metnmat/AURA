import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin";
import { requireSuperAdmin } from "@/lib/auth/admin-rbac";
import { getPlatformSystemStatus } from "@/lib/ops/platform-status";

export async function GET(request: Request) {
  const session = await requireAdminSession(request);
  if (session instanceof NextResponse) return session;

  const denied = requireSuperAdmin(session);
  if (denied) return denied;

  try {
    const status = await getPlatformSystemStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("System status error:", error);
    return NextResponse.json({ error: "Failed to load system status" }, { status: 500 });
  }
}
