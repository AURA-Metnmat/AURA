import { db } from "@/lib/db";
import { sanitizeEmployeeName } from "./validation";

export function generateNumericPassword(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function generateEmployeeCode(companyId: string): Promise<string> {
  const latest = await db.employee.findFirst({
    where: { companyId },
    orderBy: { employeeCode: "desc" },
    select: { employeeCode: true },
  });

  let seq = 1;
  if (latest?.employeeCode) {
    const match = latest.employeeCode.match(/^EMP(\d+)$/);
    if (match) seq = parseInt(match[1], 10) + 1;
  }

  for (let offset = 0; offset < 10; offset += 1) {
    const code = `EMP${String(seq + offset).padStart(3, "0")}`;
    const exists = await db.employee.findFirst({
      where: { companyId, employeeCode: code },
      select: { id: true },
    });
    if (!exists) return code;
  }

  throw new Error("Unable to generate unique employee code");
}

export async function generateUniqueUsername(
  companyId: string,
  employeeName: string
): Promise<string> {
  const base = sanitizeEmployeeName(employeeName);
  let candidate = base;
  let suffix = 2;

  while (
    await db.employee.findFirst({
      where: { companyId, username: candidate },
      select: { id: true },
    })
  ) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }

  return candidate;
}
