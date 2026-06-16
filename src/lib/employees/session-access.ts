import { NextResponse } from "next/server";
import { requireEmployeeSession } from "@/lib/auth/employee";

export async function assertEmployeeOwnsSession(
  request: Request,
  session: { id: string; companyId: string; employeeId: string | null }
): Promise<NextResponse | null> {
  if (!session.employeeId) return null;

  const auth = await requireEmployeeSession(request, session.companyId);
  if (auth instanceof NextResponse) return auth;

  if (auth.session.employeeId !== session.employeeId) {
    return NextResponse.json({ error: "Unauthorized session access" }, { status: 403 });
  }

  return null;
}
