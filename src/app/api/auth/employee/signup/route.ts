import { NextResponse } from "next/server";
import { attachSessionCookie, registerEmployee } from "@/lib/auth/employee-otp/direct-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await registerEmployee(body, request);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const response = NextResponse.json(result.data);
    attachSessionCookie(response, result.sessionToken);
    return response;
  } catch (error) {
    console.error("employee signup error:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
