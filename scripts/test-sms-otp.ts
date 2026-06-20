import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "../src/lib/db/client";
import { sendOtp } from "../src/lib/auth/employee-otp/sms-provider";

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env");
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

async function main(): Promise<void> {
  const companies = await db.company.findMany({
    select: { slug: true, name: true },
  });
  console.log("Companies:", companies);
  console.log("OTP_PROVIDER:", process.env.OTP_PROVIDER);
  console.log("MSG91_AUTH_KEY set:", Boolean(process.env.MSG91_AUTH_KEY?.trim()));
  console.log("MSG91_OTP_TEMPLATE_ID:", process.env.MSG91_OTP_TEMPLATE_ID ?? "(missing)");

  const sms = await sendOtp({
    to: "9903332849",
    otp: "482910",
    purpose: "EMPLOYEE_SIGNUP",
    companyName: "Jindal Stainless Limited",
  });
  console.log("MSG91 sendOtp:", sms);

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
