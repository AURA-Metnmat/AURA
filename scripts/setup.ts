import { getAppEnv } from "../src/lib/env";
import { db } from "../src/lib/db/client";

async function main(): Promise<void> {
  console.log("AURA-METNMAT — Production setup\n");

  const config = getAppEnv();
  if (!config.databaseUrl) {
    console.error("❌ DATABASE_URL is missing in .env");
    console.error("   Supabase → Settings → Database → URI (Transaction pooler, port 6543)");
    process.exit(1);
  }

  console.log("✓ Environment validated");
  console.log("→ Pushing schema to Supabase Postgres...");

  const { execSync } = await import("child_process");
  execSync("npx prisma db push", { stdio: "inherit", cwd: process.cwd() });

  console.log("→ Seeding default companies...");
  execSync("npm run db:seed", { stdio: "inherit", cwd: process.cwd() });

  const count = await db.company.count();
  console.log(`\n✓ Setup complete — ${count} companies in database`);
  console.log("→ Start app: npm run dev");
  console.log("→ Admin login: http://localhost:3000/admin/login");

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
