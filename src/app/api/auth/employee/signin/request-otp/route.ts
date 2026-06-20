import { NextResponse } from "next/server";
import { requestSigninOtp } from "@/lib/auth/employee-otp/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await requestSigninOtp(body, request);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error("signin request-otp error:", error);
    return NextResponse.json({ error: "Could not send OTP. Please try again." }, { status: 500 });
  }
}
