import { runReferenceImport } from "../src/lib/import/reference-import";
import { db } from "../src/lib/db/client";

async function main(): Promise<void> {
  const companySlug = process.env.IMPORT_COMPANY_SLUG ?? "jsl";
  console.log(`AURA-METNMAT — Importing reference data for: ${companySlug}...\n`);
  const stats = await runReferenceImport(companySlug);
  console.log("\nImport complete:", stats);
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
