import { NextResponse } from "next/server";
import { Prisma } from "@/generated/client";
import { db } from "@/lib/db";
import {
  createEmployeeSessionToken,
  employeeSessionCookieOptions,
  hashPassword,
} from "@/lib/auth/employee";
import { generateEmployeeCode, generateNumericPassword, generateUniqueUsername } from "@/lib/employees/credentials";
import { logEmployeeAuth } from "@/lib/employees/auth-log";
import {
  isValidDesignation,
  isValidEmail,
  isValidMobileNumber,
  normalizeMobileNumber,
  sanitizeDesignation,
  sanitizeEmployeeName,
  sanitizeTextInput,
} from "@/lib/employees/validation";
import { deliverEmployeeCredentials } from "@/lib/notifications/credentials-delivery";

interface RegisterBody {
  employee_name?: string;
  designation?: string;
  mobile_number?: string;
  email?: string;
  company_id?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const employeeName = sanitizeEmployeeName(body.employee_name ?? "");
    const designation = sanitizeDesignation(body.designation ?? "");
    const mobileNumber = normalizeMobileNumber(body.mobile_number ?? "");
    const email = body.email?.trim() ? sanitizeTextInput(body.email, 254) : null;
    const companyId = body.company_id?.trim();

    if (!employeeName || employeeName.length < 2) {
      return NextResponse.json({ error: "Employee name is required." }, { status: 400 });
    }
    if (!isValidDesignation(designation)) {
      return NextResponse.json(
        { error: "Designation / job title is required (e.g. Production Manager)." },
        { status: 400 }
      );
    }
    if (!isValidMobileNumber(mobileNumber)) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
    }
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!companyId) {
      return NextResponse.json({ error: "Company context is required." }, { status: 400 });
    }

    const company = await db.company.findFirst({
      where: { id: companyId, isActive: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    const existing = await db.employee.findFirst({
      where: { companyId, mobileNumber },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This mobile number is already registered. Please log in instead." },
        { status: 409 }
      );
    }

    const username = await generateUniqueUsername(companyId, employeeName);
    const plainPassword = generateNumericPassword();
    const passwordHash = await hashPassword(plainPassword);
    const employeeCode = await generateEmployeeCode(companyId);

    const employee = await db.employee.create({
      data: {
        employeeCode,
        companyId,
        employeeName,
        designation,
        mobileNumber,
        email,
        username,
        passwordHash,
        isFirstLogin: true,
        accountStatus: "active",
      },
    });

    await logEmployeeAuth(employee.id, "register", request, { employeeCode, username, designation });

    const delivery = await deliverEmployeeCredentials({
      companyName: company.name,
      username,
      password: plainPassword,
      mobileNumber,
      email,
    });

    if (!delivery.smsSent) {
      await db.employee.delete({ where: { id: employee.id } });
      return NextResponse.json(
        {
          error:
            "Could not send SMS credentials. Configure Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) or use development mode.",
        },
        { status: 503 }
      );
    }

    const token = createEmployeeSessionToken(employee.id, companyId);
    const response = NextResponse.json({
      success: true,
      employee_id: employee.employeeCode,
      username,
      designation,
      message: "Credentials sent successfully.",
      email_sent: delivery.emailSent,
      dev_credentials_logged: delivery.devLogged,
    });
    response.cookies.set(employeeSessionCookieOptions(token));
    return response;
  } catch (error) {
    console.error("Employee register error:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "This mobile number is already registered. Please log in instead." },
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
