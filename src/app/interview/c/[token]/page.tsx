"use client";

import { useEffect, useState } from "react";
import InterviewFlow from "@/components/InterviewFlow";

export default function CompanyInterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/companies/token/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Invalid link");
        return r.json();
      })
      .then((d) => setCompany(d.company))
      .catch(() => setError("This interview link is invalid or has expired. Please contact your administrator."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Loading interview...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-red-400 mb-3">Link Not Valid</h1>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return <InterviewFlow companyId={company.id} companyName={company.name} />;
}
