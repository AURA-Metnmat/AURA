import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Direct registration is disabled. Use Register & start interview with mobile OTP verification.",
    },
    { status: 410 }
  );
}
