import Link from "next/link";
import { PLATFORM_NAME, DEFAULT_GAPS } from "@/lib/aura/config";

const FEATURES = [
  {
    title: "Company Reference Database",
    desc: "Stores each client's Excel, PDF, and operational reference data — scoped per company METNMAT onboarded.",
    href: "/admin",
    tag: "Database 1",
  },
  {
    title: "AI Stakeholder Interviews",
    desc: "Employees use a company-specific link — language, details, then AI chat with attachments. No admin login required.",
    href: "/interview",
    tag: "Database 2",
  },
  {
    title: "Multi-Company Platform",
    desc: "METNMAT can onboard any client company — each gets isolated reference data, interviews, and AI-tuned context.",
    href: "/admin",
    tag: "Multi-Tenant",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-600/5" />
        <div className="relative max-w-6xl mx-auto px-6 py-16">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-400 mb-4">
            Powered by METNMAT
          </p>
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            {PLATFORM_NAME}
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl leading-relaxed">
            AI Requirement Gathering &amp; Stakeholder Interview Platform for Any Enterprise
          </p>
          <p className="text-slate-500 mt-3 max-w-xl text-sm">
            One platform for all METNMAT client companies — capture employee knowledge, reference data, and requirements through intelligent conversations.
          </p>
          <div className="flex gap-4 mt-8">
            <Link
              href="/admin"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Admin Dashboard
            </Link>
            <Link
              href="/admin"
              className="border border-slate-700 hover:border-slate-500 px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Onboard Company
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        <section>
          <h2 className="text-2xl font-semibold mb-6">Platform Architecture</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                className="group bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-amber-500/50 transition-all"
              >
                <span className="text-xs uppercase tracking-widest text-amber-400">{f.tag}</span>
                <h3 className="text-lg font-semibold mt-2 group-hover:text-amber-400 transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{f.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">How METNMAT Uses AURA</h2>
          <ol className="space-y-3 text-sm text-slate-400">
            <li className="flex gap-3"><span className="text-amber-500 font-bold">1</span> Add a new client company in Admin with industry context for AI</li>
            <li className="flex gap-3"><span className="text-amber-500 font-bold">2</span> Import their reference data (Excel, PDF) scoped to that company</li>
            <li className="flex gap-3"><span className="text-amber-500 font-bold">3</span> Copy & share the generated interview link with client employees</li>
            <li className="flex gap-3"><span className="text-amber-500 font-bold">4</span> Employees complete interviews — all data appears in Admin by company category</li>
          </ol>
        </section>

        <section className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">Common Information Gaps AURA Discovers</h2>
          <ul className="grid md:grid-cols-2 gap-2 text-sm text-slate-400">
            {DEFAULT_GAPS.map((gap) => (
              <li key={gap} className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">→</span>
                {gap}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-slate-800 px-6 py-6 text-center text-xs text-slate-600">
        {PLATFORM_NAME} — Enterprise Requirement Gathering by METNMAT
      </footer>
    </div>
  );
}
