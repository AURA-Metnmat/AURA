import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAndStoreOtp, type OtpPurpose } from "@/lib/employees/otp";
import { deliverEmployeeOtp, buildOtpDeliveryFailureMessage } from "@/lib/notifications/otp-delivery";
import { isValidEmail, normalizeEmail } from "@/lib/employees/validation";

interface SendOtpBody {
  email?: string;
  company_id?: string;
  purpose?: OtpPurpose;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendOtpBody;
    const email = normalizeEmail(body.email ?? "");
    const companyId = body.company_id?.trim();
    const purpose = body.purpose;

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!companyId) {
      return NextResponse.json({ error: "Company context is required." }, { status: 400 });
    }
    if (purpose !== "register" && purpose !== "login") {
      return NextResponse.json({ error: "Invalid verification purpose." }, { status: 400 });
    }

    const company = await db.company.findFirst({
      where: { id: companyId, isActive: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    const existing = await db.employee.findFirst({
      where: { companyId, email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });

    if (purpose === "register" && existing) {
      return NextResponse.json(
        { error: "This email is already registered. Use Sign in instead." },
        { status: 409 }
      );
    }

    if (purpose === "login" && !existing) {
      return NextResponse.json(
        { error: "Email not found. Please register first." },
        { status: 404 }
      );
    }

    const { code, expiresAt } = await createAndStoreOtp(companyId, email, purpose);
    const delivery = await deliverEmployeeOtp({
      companyName: company.name,
      email,
      code,
      purpose,
    });

    if (!delivery.delivered) {
      return NextResponse.json(
        {
          error: buildOtpDeliveryFailureMessage(delivery.emailError),
          email_error: delivery.emailError ?? null,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      expires_at: expiresAt.toISOString(),
      delivery_method: delivery.method,
      dev_logged: delivery.devLogged,
      ...(delivery.devLogged && process.env.NODE_ENV !== "production"
        ? { dev_otp: code }
        : {}),
    });
  } catch (error) {
    console.error("OTP send error:", error);
    return NextResponse.json({ error: "Failed to send OTP. Please try again." }, { status: 500 });
  }
}
