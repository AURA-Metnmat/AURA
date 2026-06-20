import { NextResponse } from "next/server";
import { attachSessionCookie, verifySigninOtp } from "@/lib/auth/employee-otp/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await verifySigninOtp(body, request);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const response = NextResponse.json(result.data);
    attachSessionCookie(response, result.sessionToken);
    return response;
  } catch (error) {
    console.error("signin verify-otp error:", error);
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 });
  }
}
