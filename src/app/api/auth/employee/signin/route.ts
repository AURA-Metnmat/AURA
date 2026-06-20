import { NextResponse } from "next/server";
import { attachSessionCookie, signInEmployee } from "@/lib/auth/employee-otp/direct-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await signInEmployee(body, request);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const response = NextResponse.json(result.data);
    attachSessionCookie(response, result.sessionToken);
    return response;
  } catch (error) {
    console.error("employee signin error:", error);
    return NextResponse.json({ error: "Sign in failed. Please try again." }, { status: 500 });
  }
}
