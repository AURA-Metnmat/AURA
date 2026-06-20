import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAndStoreOtp, type OtpPurpose } from "@/lib/employees/otp";
import { deliverEmployeeOtp } from "@/lib/notifications/otp-delivery";
import {
  isValidMobileNumber,
  normalizeMobileNumber,
} from "@/lib/employees/validation";

interface SendOtpBody {
  mobile_number?: string;
  company_id?: string;
  purpose?: OtpPurpose;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendOtpBody;
    const mobileNumber = normalizeMobileNumber(body.mobile_number ?? "");
    const companyId = body.company_id?.trim();
    const purpose = body.purpose;

    if (!isValidMobileNumber(mobileNumber)) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
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
      where: { companyId, mobileNumber },
    });

    if (purpose === "register" && existing) {
      return NextResponse.json(
        { error: "This mobile number is already registered. Use Sign in instead." },
        { status: 409 }
      );
    }

    if (purpose === "login" && !existing) {
      return NextResponse.json(
        { error: "Mobile number not found. Please register first." },
        { status: 404 }
      );
    }

    const { code, expiresAt } = await createAndStoreOtp(companyId, mobileNumber, purpose);
    const delivery = await deliverEmployeeOtp({
      companyName: company.name,
      mobileNumber,
      code,
      purpose,
    });

    if (!delivery.smsSent) {
      return NextResponse.json(
        { error: "Could not send OTP. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      expires_at: expiresAt.toISOString(),
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
