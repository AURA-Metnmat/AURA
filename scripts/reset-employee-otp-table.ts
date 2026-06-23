import { db } from "../src/lib/db/client";

async function main(): Promise<void> {
  await db.$executeRawUnsafe('DROP TABLE IF EXISTS "EmployeeOtp" CASCADE;');
  console.log("Dropped EmployeeOtp table");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
