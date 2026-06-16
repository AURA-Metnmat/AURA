import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  clearEmployeeSessionCookie,
  getEmployeeSession,
  requireEmployeeSession,
} from "@/lib/auth/employee";
import { findActiveSessionForEmployee } from "@/lib/employees/session-resume";
import { logEmployeeAuth } from "@/lib/employees/auth-log";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("company_id")?.trim();
    if (!companyId) {
      return NextResponse.json({ error: "company_id is required." }, { status: 400 });
    }

    const session = await getEmployeeSession();
    if (!session || session.companyId !== companyId) {
      return NextResponse.json({ authenticated: false });
    }

    const employee = await db.employee.findUnique({
      where: { id: session.employeeId },
    });
    if (!employee || employee.companyId !== companyId) {
      return NextResponse.json({ authenticated: false });
    }

    if (employee.accountStatus === "disabled") {
      const response = NextResponse.json({ authenticated: false });
      response.cookies.set(clearEmployeeSessionCookie());
      return response;
    }

    if (employee.lockedUntil && employee.lockedUntil.getTime() > Date.now()) {
      const response = NextResponse.json({ authenticated: false });
      response.cookies.set(clearEmployeeSessionCookie());
      return response;
    }

    const activeSession = await findActiveSessionForEmployee(employee.id, companyId);

    return NextResponse.json({
      authenticated: true,
      employee: {
        employee_id: employee.employeeCode,
        employee_name: employee.employeeName,
        username: employee.username,
        mobile_number: employee.mobileNumber,
        email: employee.email,
        designation: employee.designation,
        department: employee.department,
        is_first_login: employee.isFirstLogin,
        account_status: employee.accountStatus,
      },
      active_session: activeSession,
    });
  } catch (error) {
    console.error("Employee me error:", error);
    return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { company_id?: string };
    const companyId = body.company_id?.trim();
    const auth = await requireEmployeeSession(request, companyId);
    if (auth instanceof NextResponse) return auth;

    await logEmployeeAuth(auth.session.employeeId, "logout", request);

    const response = NextResponse.json({ success: true });
    response.cookies.set(clearEmployeeSessionCookie());
    return response;
  } catch (error) {
    console.error("Employee logout error:", error);
    return NextResponse.json({ error: "Logout failed." }, { status: 500 });
  }
}
