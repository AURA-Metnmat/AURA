import { db } from "../src/lib/db/client";

async function main(): Promise<void> {
  const companies = await db.company.findMany({
    where: { isActive: true },
    select: { name: true, slug: true, inviteToken: true },
    take: 5,
  });

  for (const c of companies) {
    console.log(`${c.name} (${c.slug}): http://localhost:3000/interview/c/${c.inviteToken}`);
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
