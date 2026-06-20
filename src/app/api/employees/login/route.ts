import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Direct sign-in is disabled. Use Continue interview with mobile OTP verification.",
    },
    { status: 410 }
  );
}
