import { db } from "../src/lib/db/client";
import { deleteCompanyCompletely } from "../src/lib/companies/delete-company";

async function main(): Promise<void> {
  const company = await db.company.findFirst({
    where: { slug: "demo-corp" },
    select: { id: true, name: true },
  });
  console.log("company:", company);
  if (!company) {
    console.log("demo-corp not found, trying jsl");
    const jsl = await db.company.findFirst({
      where: { slug: "jsl" },
      select: { id: true, name: true },
    });
    console.log("jsl:", jsl);
    if (jsl) {
      try {
        const result = await deleteCompanyCompletely(jsl.id);
        console.log("DELETE OK:", result);
      } catch (e) {
        console.error("DELETE FAILED:", e);
      }
    }
    await db.$disconnect();
    return;
  }

  try {
    const result = await deleteCompanyCompletely(company.id);
    console.log("DELETE OK:", result);
  } catch (e) {
    console.error("DELETE FAILED:", e);
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
