import { db } from "../src/lib/db/client";
import { generateInviteToken } from "@/lib/aura/company-utils";

const JSL_AI_CONTEXT = `Reference data available (furnace/industrial operations):
- Submerged Arc Furnaces (SAF) operations with metal analysis tracking
- Raw materials, reductants, briquette blends, and binder QC workflows
- Lab analysis workflows with XRF chemical composition data
- Known gaps: SCADA integration, charge mix approval, SAP module usage, Excel dependencies`;

export async function seedCompanies(): Promise<void> {
  const companies = [
    {
      slug: "jsl",
      inviteToken: generateInviteToken(),
      name: "JSL (Jindal Stainless)",
      category: "Steel & Metals",
      industry: "Steel & Ferro Alloys / Furnace Operations",
      description:
        "Submerged arc furnace operations at Jajpur, Odisha. SAF metal analysis, raw materials, reductants, and briquette blend tracking.",
      aiContext: JSL_AI_CONTEXT,
      location: "Jajpur, Odisha, India",
    },
    {
      slug: "demo-corp",
      inviteToken: generateInviteToken(),
      name: "Demo Corporation",
      category: "Manufacturing",
      industry: "Manufacturing",
      description: "Sample company for demonstrating AURA-METNMAT platform capabilities.",
      aiContext: null,
      location: null,
    },
  ];

  for (const c of companies) {
    const existing = await db.company.findUnique({ where: { slug: c.slug } });
    await db.company.upsert({
      where: { slug: c.slug },
      create: c,
      update: {
        name: c.name,
        category: c.category,
        industry: c.industry,
        description: c.description,
        aiContext: c.aiContext,
        location: c.location,
        isActive: true,
        ...(!existing?.inviteToken ? { inviteToken: c.inviteToken } : {}),
      },
    });
  }

  console.log(`Seeded ${companies.length} companies`);
}

async function main(): Promise<void> {
  await seedCompanies();
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
