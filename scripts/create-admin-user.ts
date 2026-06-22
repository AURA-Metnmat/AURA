import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/employee";
import { ADMIN_ROLES } from "@/lib/auth/admin-rbac";

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3]?.trim();
  const role = (process.argv[4]?.trim() ?? ADMIN_ROLES.SUPER_ADMIN) as string;
  const companyId = process.argv[5]?.trim() || null;

  if (!email || !password) {
    console.error(
      "Usage: npx tsx scripts/create-admin-user.ts <email> <password> [role] [companyId]"
    );
    process.exit(1);
  }

  if (password.length < 12) {
    console.error("Password must be at least 12 characters");
    process.exit(1);
  }

  const user = await db.adminUser.upsert({
    where: { email },
    create: {
      email,
      passwordHash: await hashPassword(password),
      role,
      companyId: role === ADMIN_ROLES.SUPER_ADMIN ? null : companyId,
      name: email.split("@")[0] ?? "Admin",
    },
    update: {
      passwordHash: await hashPassword(password),
      role,
      companyId: role === ADMIN_ROLES.SUPER_ADMIN ? null : companyId,
      isActive: true,
    },
  });

  console.log(`Admin user ready: ${user.email} (${user.role})`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
