import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  hashPassword,
  requireEmployeeSession,
  verifyPassword,
} from "@/lib/auth/employee";
import { logEmployeeAuth } from "@/lib/employees/auth-log";

interface ChangePasswordBody {
  current_password?: string;
  new_password?: string;
  company_id?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChangePasswordBody;
    const currentPassword = body.current_password ?? "";
    const newPassword = body.new_password ?? "";
    const companyId = body.company_id?.trim();

    if (!companyId) {
      return NextResponse.json({ error: "Company context is required." }, { status: 400 });
    }
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new passwords are required." }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters." },
        { status: 400 }
      );
    }
    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "New password must be different from your current password." },
        { status: 400 }
      );
    }

    const auth = await requireEmployeeSession(request, companyId);
    if (auth instanceof NextResponse) return auth;

    const employee = await db.employee.findUnique({
      where: { id: auth.session.employeeId },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, employee.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    const passwordHash = await hashPassword(newPassword);
    await db.employee.update({
      where: { id: employee.id },
      data: {
        passwordHash,
        isFirstLogin: false,
      },
    });

    await logEmployeeAuth(employee.id, "password_change", request);

    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
      is_first_login: false,
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Failed to change password." }, { status: 500 });
  }
}
