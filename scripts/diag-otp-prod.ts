import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "../src/lib/db/client";
import { deliverEmployeeOtp } from "../src/lib/notifications/otp-delivery";

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
  const company = await db.company.findFirst({
    where: { slug: "jsl" },
    select: { id: true, name: true },
  });
  if (!company) {
    console.log("No JSL company");
    await db.$disconnect();
    return;
  }

  console.log("Company:", company);

  const delivery = await deliverEmployeeOtp({
    companyName: company.name,
    mobileNumber: "9903332849",
    code: "123456",
    purpose: "register",
  });
  console.log("Local delivery result:", delivery);

  const prodUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://aura-blond-one.vercel.app";
  const res = await fetch(`${prodUrl}/api/employees/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mobile_number: "9903332849",
      company_id: company.id,
      purpose: "register",
    }),
  });
  const data = await res.json();
  console.log("Production API:", res.status, data);

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
