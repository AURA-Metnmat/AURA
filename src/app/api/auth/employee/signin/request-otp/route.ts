import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "OTP verification is disabled. Use POST /api/auth/employee/signin instead." },
    { status: 410 }
  );
}
