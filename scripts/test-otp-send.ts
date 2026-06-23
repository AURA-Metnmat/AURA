import { db } from "../src/lib/db/client";

async function main(): Promise<void> {
  const company = await db.company.findFirst({
    where: { slug: "jsl" },
    select: { id: true, name: true },
  });
  if (!company) {
    console.log("No JSL company found");
    await db.$disconnect();
    return;
  }

  const testMobile = "9876543210";
  const base = "http://localhost:3000";

  console.log("Company:", company.id, company.name);

  const sendRes = await fetch(`${base}/api/employees/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mobile_number: testMobile,
      company_id: company.id,
      purpose: "register",
    }),
  });
  const sendData = await sendRes.json();
  console.log("SEND status:", sendRes.status, sendData);

  if (!sendRes.ok) {
    await db.$disconnect();
    return;
  }

  const otp = await db.employeeOtp.findFirst({
    where: { companyId: company.id, mobileNumber: testMobile, purpose: "register" },
    orderBy: { createdAt: "desc" },
  });
  console.log("OTP record exists:", !!otp);

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
