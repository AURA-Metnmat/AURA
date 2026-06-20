import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createEmployeeSessionToken,
  employeeSessionCookieOptions,
} from "@/lib/auth/employee";
import { logEmployeeAuth } from "@/lib/employees/auth-log";
import { findActiveSessionForEmployee } from "@/lib/employees/session-resume";
import { verifyOtpVerificationToken } from "@/lib/employees/otp";

import {
  isValidMobileNumber,
  normalizeMobileNumber,
} from "@/lib/employees/validation";

interface LoginBody {
  mobile_number?: string;
  company_id?: string;
  otp_token?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const mobileNumber = normalizeMobileNumber(body.mobile_number ?? "");
    const companyId = body.company_id?.trim();
    const otpToken = body.otp_token?.trim();

    if (!otpToken) {
      return NextResponse.json({ error: "Mobile verification is required." }, { status: 400 });
    }

    if (!isValidMobileNumber(mobileNumber)) {
      return NextResponse.json({ error: "Enter your registered 10-digit mobile number." }, { status: 400 });
    }
    if (!companyId) {
      return NextResponse.json({ error: "Company context is required." }, { status: 400 });
    }

    const otpVerified = verifyOtpVerificationToken(otpToken, companyId, mobileNumber, "login");
    if (!otpVerified) {
      return NextResponse.json(
        { error: "Mobile verification expired. Please verify your number again." },
        { status: 401 }
      );
    }

    const employee = await db.employee.findFirst({
      where: { companyId, mobileNumber },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Mobile number not found. Please register first." },
        { status: 404 }
      );
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

    await db.employee.update({
      where: { id: employee.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        accountStatus: employee.accountStatus === "locked" ? "active" : employee.accountStatus,
        isFirstLogin: false,
      },
    });

    await logEmployeeAuth(employee.id, "login_success", request);

    const activeSession = await findActiveSessionForEmployee(employee.id, companyId);

    const token = createEmployeeSessionToken(employee.id, companyId);
    const response = NextResponse.json({
      success: true,
      employee_id: employee.employeeCode,
      employee_name: employee.employeeName,
      designation: employee.designation,
      department: employee.department,
      mobile_number: employee.mobileNumber,
      email: employee.email,
      active_session: activeSession,
    });
    response.cookies.set(employeeSessionCookieOptions(token));
    return response;
  } catch (error) {
    console.error("Employee login error:", error);
    return NextResponse.json({ error: "Sign in failed. Please try again." }, { status: 500 });
  }
}
