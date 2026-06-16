import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createEmployeeSessionToken,
  employeeSessionCookieOptions,
  verifyPassword,
} from "@/lib/auth/employee";
import { logEmployeeAuth } from "@/lib/employees/auth-log";
import { sanitizeTextInput } from "@/lib/employees/validation";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

interface LoginBody {
  username?: string;
  password?: string;
  company_id?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const username = sanitizeTextInput(body.username ?? "", 120);
    const password = body.password ?? "";
    const companyId = body.company_id?.trim();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }
    if (!companyId) {
      return NextResponse.json({ error: "Company context is required." }, { status: 400 });
    }

    const employee = await db.employee.findFirst({
      where: { companyId, username },
    });

    if (!employee) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    if (employee.accountStatus === "disabled") {
      return NextResponse.json({ error: "Account is disabled. Contact your administrator." }, { status: 403 });
    }

    if (employee.lockedUntil && employee.lockedUntil.getTime() > Date.now()) {
      const minutesLeft = Math.ceil((employee.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Account temporarily locked. Try again in ${minutesLeft} minute(s).` },
        { status: 429 }
      );
    }

    const valid = await verifyPassword(password, employee.passwordHash);
    if (!valid) {
      const attempts = employee.failedLoginAttempts + 1;
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
      await db.employee.update({
        where: { id: employee.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
          accountStatus: shouldLock ? "locked" : employee.accountStatus,
        },
      });
      await logEmployeeAuth(employee.id, shouldLock ? "account_locked" : "login_failed", request, {
        attempts,
      });
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    await db.employee.update({
      where: { id: employee.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        accountStatus: employee.accountStatus === "locked" ? "active" : employee.accountStatus,
      },
    });

    await logEmployeeAuth(employee.id, "login_success", request);

    const token = createEmployeeSessionToken(employee.id, companyId);
    const response = NextResponse.json({
      success: true,
      employee_id: employee.employeeCode,
      username: employee.username,
      is_first_login: employee.isFirstLogin,
      employee_name: employee.employeeName,
      designation: employee.designation,
      mobile_number: employee.mobileNumber,
      email: employee.email,
    });
    response.cookies.set(employeeSessionCookieOptions(token));
    return response;
  } catch (error) {
    console.error("Employee login error:", error);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
