import { NextResponse } from "next/server";
import { Prisma } from "@/generated/client";
import { db } from "@/lib/db";
import {
  createEmployeeSessionToken,
  employeeSessionCookieOptions,
  hashPassword,
} from "@/lib/auth/employee";
import { generateEmployeeCode, generateUniqueUsername } from "@/lib/employees/credentials";
import { logEmployeeAuth } from "@/lib/employees/auth-log";
import { verifyOtpVerificationToken } from "@/lib/employees/otp";

import {
  isValidDesignation,
  isValidEmail,
  isValidMobileNumber,
  normalizeEmail,
  normalizeMobileNumber,
  sanitizeDesignation,
  sanitizeEmployeeName,
  sanitizeTextInput,
} from "@/lib/employees/validation";

interface RegisterBody {
  employee_name?: string;
  designation?: string;
  department?: string;
  mobile_number?: string;
  email?: string;
  company_id?: string;
  otp_token?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const employeeName = sanitizeEmployeeName(body.employee_name ?? "");
    const designation = sanitizeDesignation(body.designation ?? "");
    const department = sanitizeTextInput(body.department ?? "", 120);
    const mobileNumber = normalizeMobileNumber(body.mobile_number ?? "");
    const email = normalizeEmail(body.email ?? "");
    const companyId = body.company_id?.trim();
    const otpToken = body.otp_token?.trim();

    if (!otpToken) {
      return NextResponse.json({ error: "Email verification is required." }, { status: 400 });
    }

    if (!employeeName || employeeName.length < 2) {
      return NextResponse.json({ error: "Employee name is required." }, { status: 400 });
    }
    if (!isValidDesignation(designation)) {
      return NextResponse.json(
        { error: "Designation / job title is required (e.g. Production Manager)." },
        { status: 400 }
      );
    }
    if (!department || department.length < 2) {
      return NextResponse.json({ error: "Department is required." }, { status: 400 });
    }
    if (!isValidMobileNumber(mobileNumber)) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!companyId) {
      return NextResponse.json({ error: "Company context is required." }, { status: 400 });
    }

    const otpVerified = verifyOtpVerificationToken(otpToken, companyId, email, "register");
    if (!otpVerified) {
      return NextResponse.json(
        { error: "Email verification expired. Please verify your email again." },
        { status: 401 }
      );
    }

    const company = await db.company.findFirst({
      where: { id: companyId, isActive: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    const existing = await db.employee.findFirst({
      where: {
        companyId,
        OR: [
          { mobileNumber },
          { email: { equals: email, mode: "insensitive" } },
        ],
      },
    });
    if (existing) {
      const message =
        existing.email?.toLowerCase() === email
          ? "This email is already registered. Use Sign in instead."
          : "This mobile number is already registered. Use Sign in instead.";
      return NextResponse.json({ error: message }, { status: 409 });
    }

    const username = await generateUniqueUsername(companyId, employeeName);
    const passwordHash = await hashPassword(mobileNumber);
    const employeeCode = await generateEmployeeCode(companyId);

    const employee = await db.employee.create({
      data: {
        employeeCode,
        companyId,
        employeeName,
        designation,
        department,
        mobileNumber,
        email,
        username,
        passwordHash,
        isFirstLogin: false,
        accountStatus: "active",
      },
    });

    await logEmployeeAuth(employee.id, "register", request, { employeeCode, username, designation });

    const token = createEmployeeSessionToken(employee.id, companyId);
    const response = NextResponse.json({
      success: true,
      employee_id: employee.employeeCode,
      employee_name: employee.employeeName,
      designation: employee.designation,
      department: employee.department,
      mobile_number: employee.mobileNumber,
      email: employee.email,
    });
    response.cookies.set(employeeSessionCookieOptions(token));
    return response;
  } catch (error) {
    console.error("Employee register error:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "This mobile number is already registered. Use Sign in with your mobile number." },
          { status: 409 }
        );
      }
      if (error.code === "P2021") {
        return NextResponse.json(
          { error: "Employee tables are not set up yet. Run database migration (db push)." },
          { status: 503 }
        );
      }
    }

    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
