import { NextResponse } from "next/server";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { getCompanyInterviewAnalytics } from "@/lib/analytics/company-analytics";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireCompanyAdmin(request, id, PERMISSIONS.EXPORT_DATA);
  if (session instanceof NextResponse) return session;

  try {
    const analytics = await getCompanyInterviewAnalytics(id);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Company analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
