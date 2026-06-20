import { NextResponse } from "next/server";
import { verifyOtpCode, type OtpPurpose } from "@/lib/employees/otp";
import { isValidEmail, normalizeEmail } from "@/lib/employees/validation";

interface VerifyOtpBody {
  email?: string;
  company_id?: string;
  purpose?: OtpPurpose;
  code?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyOtpBody;
    const email = normalizeEmail(body.email ?? "");
    const companyId = body.company_id?.trim();
    const purpose = body.purpose;
    const code = body.code?.trim().replace(/\D/g, "");

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!companyId) {
      return NextResponse.json({ error: "Company context is required." }, { status: 400 });
    }
    if (purpose !== "register" && purpose !== "login") {
      return NextResponse.json({ error: "Invalid verification purpose." }, { status: 400 });
    }
    if (!code || code.length !== 6) {
      return NextResponse.json({ error: "Enter the 6-digit OTP." }, { status: 400 });
    }

    const result = await verifyOtpCode(companyId, email, purpose, code);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      otp_token: result.token,
    });
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json({ error: "OTP verification failed. Please try again." }, { status: 500 });
  }
}
