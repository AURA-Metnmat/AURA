import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth/admin";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ok = await isAdminAuthenticated();
  if (!ok) {
    redirect("/admin/login");
  }
  return children;
}
