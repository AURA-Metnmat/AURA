import "@/test/test-env";
import { createAdminSessionToken } from "@/lib/auth/admin";
import type { AdminRole } from "@/lib/auth/admin-rbac";

export function bearerRequest(
  path: string,
  session: {
    adminUserId?: string | null;
    email?: string | null;
    role: AdminRole;
    companyId?: string | null;
    legacy?: boolean;
  },
  init?: RequestInit
): Request {
  const token = createAdminSessionToken(session);
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return new Request(`http://localhost${path}`, { ...init, headers });
}

export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
