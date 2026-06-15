import Link from "next/link";

export default function InterviewIndexPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-2xl font-bold">AURA-METNMAT Interview</h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          Employees should use the interview link provided by METNMAT admin for their company.
          Each company has a unique link — ask your administrator if you don&apos;t have one.
        </p>
        <Link href="/" className="inline-block text-amber-400 hover:text-amber-300 text-sm">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
