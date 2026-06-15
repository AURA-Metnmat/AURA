import Link from "next/link";
import { DEFAULT_GAPS } from "@/lib/aura/config";
import { PixelHero } from "@/components/ui/pixel-perfect-hero";
import {
  ArrowUpRight,
  Building2,
  Database,
  MessageSquare,
  Users,
} from "lucide-react";

const FEATURES = [
  {
    title: "Company Reference Database",
    desc: "Stores each client's Excel, PDF, and operational reference data — scoped per company METNMAT onboarded.",
    href: "/admin",
    tag: "Database 1",
    icon: Database,
  },
  {
    title: "AI Stakeholder Interviews",
    desc: "Employees use a company-specific link — language, details, then AI chat with attachments. No admin login required.",
    href: "/interview",
    tag: "Database 2",
    icon: MessageSquare,
  },
  {
    title: "Multi-Company Platform",
    desc: "METNMAT can onboard any client company — each gets isolated reference data, interviews, and AI-tuned context.",
    href: "/admin",
    tag: "Multi-Tenant",
    icon: Users,
  },
];

const STEPS = [
  "Add a new client company in Admin with industry context for AI",
  "Import their reference data (Excel, PDF) scoped to that company",
  "Copy & share the generated interview link with client employees",
  "Employees complete interviews — all data appears in Admin by company category",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PixelHero
        word1="AURA"
        word2="METNMAT"
        eyebrow="Powered by METNMAT"
        description="AI Requirement Gathering & Stakeholder Interview Platform for Any Enterprise. One platform for all METNMAT client companies — capture employee knowledge, reference data, and requirements through intelligent conversations."
        primaryHref="/admin"
        secondaryHref="/admin"
        primaryCta="Admin Dashboard"
        primaryCtaMobile="Admin"
        secondaryCta="Onboard Company"
        secondaryCtaMobile="Onboard"
        stackLabel="Built on enterprise-grade technology"
      />

      <main id="platform" className="max-w-6xl mx-auto px-6 py-20 space-y-20">
        <section>
          <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-primary mb-2">Architecture</p>
              <h2 className="text-3xl font-bold tracking-tight">Platform Architecture</h2>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Open admin <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Link
                  key={f.title}
                  href={f.href}
                  className="group bg-card rounded-2xl p-6 border border-border hover:border-primary/40 hover:shadow-[0_0_40px_rgba(245,158,11,0.08)] transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase tracking-widest text-primary">{f.tag}</span>
                    <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl p-8 border border-border">
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">How METNMAT Uses AURA</h2>
            </div>
            <ol className="space-y-4 text-sm text-muted-foreground">
              {STEPS.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-card rounded-2xl p-8 border border-border">
            <h2 className="text-xl font-semibold mb-6">Common Information Gaps AURA Discovers</h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {DEFAULT_GAPS.map((gap) => (
                <li key={gap} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">→</span>
                  <span className="leading-relaxed">{gap}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to onboard your first company?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-sm md:text-base">
            Set up a client in minutes, generate a secure interview link, and start capturing stakeholder knowledge today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/admin"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Get Started <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              href="/interview"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-6 text-sm font-semibold hover:bg-card transition-colors"
            >
              Preview Interview Flow
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        AURA-METNMAT — Enterprise Requirement Gathering by METNMAT
      </footer>
    </div>
  );
}
