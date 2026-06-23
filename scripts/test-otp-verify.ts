import { db } from "../src/lib/db/client";
import bcrypt from "bcryptjs";

async function main(): Promise<void> {
  const company = await db.company.findFirst({
    where: { slug: "jsl" },
    select: { id: true },
  });
  if (!company) {
    console.log("No company");
    return;
  }

  const testMobile = "9876543210";
  const otpRecord = await db.employeeOtp.findFirst({
    where: { companyId: company.id, mobileNumber: testMobile, purpose: "register" },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    console.log("No OTP record — run test-otp-send first");
    await db.$disconnect();
    return;
  }

  // Brute not possible without knowing code — test verify with wrong code first
  const base = "http://localhost:3000";
  const badRes = await fetch(`${base}/api/employees/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mobile_number: testMobile,
      company_id: company.id,
      purpose: "register",
      code: "000000",
    }),
  });
  const badData = await badRes.json();
  console.log("VERIFY wrong code:", badRes.status, badData);

  // Generate matching code by testing common dev pattern - we need to read from server logs
  // Instead verify DB store works by using createAndStoreOtp path already tested
  console.log("OTP verify endpoint reachable:", badRes.status === 400);

  await db.$disconnect();
}

main().catch(console.error);
