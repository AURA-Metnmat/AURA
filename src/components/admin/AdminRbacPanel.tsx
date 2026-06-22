"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Shield, ScrollText } from "lucide-react";
import { ADMIN_ROLE_LABELS, ADMIN_ROLES } from "@/lib/auth/admin-rbac";

interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  roleLabel: string;
  companyId: string | null;
  companyName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

interface AuditRow {
  id: string;
  action: string;
  actorEmail: string | null;
  companyName: string | null;
  resourceType: string | null;
  createdAt: string;
}

interface CompanyOption {
  id: string;
  name: string;
}

interface AdminRbacPanelProps {
  glassCard: string;
  companies: CompanyOption[];
}

export default function AdminRbacPanel({ glassCard, companies }: AdminRbacPanelProps) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>(ADMIN_ROLES.COMPANY_ADMIN);
  const [companyId, setCompanyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, logsRes] = await Promise.all([
        fetch("/api/admin/users", { credentials: "include" }),
        fetch("/api/admin/audit-log?limit=40", { credentials: "include" }),
      ]);
      const usersData = await usersRes.json();
      const logsData = await logsRes.json();
      if (!usersRes.ok) throw new Error(usersData.error ?? "Failed to load users");
      if (!logsRes.ok) throw new Error(logsData.error ?? "Failed to load audit log");
      setUsers(usersData.users ?? []);
      setLogs(logsData.logs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load admin settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createUser() {
    if (!email.trim() || !password.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          role,
          companyId: role === ADMIN_ROLES.SUPER_ADMIN ? null : companyId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create user");
      setEmail("");
      setPassword("");
      setName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          Admin users
        </h3>

        <div className={`${glassCard} p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3`}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 12 chars)"
            className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
          >
            {Object.entries(ADMIN_ROLE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          {role !== ADMIN_ROLES.SUPER_ADMIN && (
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          type="button"
          disabled={saving || !email.trim() || !password.trim()}
          onClick={() => void createUser()}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-200 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Create admin user
        </button>

        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className={`${glassCard} px-4 py-3 flex flex-wrap items-center justify-between gap-2`}
            >
              <div>
                <p className="text-sm text-slate-100">{u.email}</p>
                <p className="text-[11px] text-slate-500">
                  {u.roleLabel}
                  {u.companyName ? ` · ${u.companyName}` : ""}
                  {!u.isActive ? " · inactive" : ""}
                </p>
              </div>
              <p className="text-[10px] text-slate-600">
                {u.lastLoginAt ? `Last login ${new Date(u.lastLoginAt).toLocaleString()}` : "Never logged in"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-indigo-400" />
          Recent audit log
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className={`${glassCard} px-4 py-2.5 text-xs`}>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-300 font-mono">{log.action}</span>
                <span className="text-slate-600">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-slate-500 mt-1">
                {log.actorEmail ?? "system"}
                {log.companyName ? ` · ${log.companyName}` : ""}
                {log.resourceType ? ` · ${log.resourceType}` : ""}
              </p>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-sm text-slate-500">No audit events yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
