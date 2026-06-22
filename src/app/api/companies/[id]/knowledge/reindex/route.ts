import { NextResponse } from "next/server";
import { after } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { PERMISSIONS } from "@/lib/auth/admin-rbac";
import { parseReindexScope } from "@/lib/knowledge/reindex-job-types";
import {
  enqueueReindexJob,
  getLatestReindexJob,
  getReindexJob,
  listReindexJobs,
  runReindexJob,
} from "@/lib/knowledge/reindex-jobs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;
  const session = await requireCompanyAdmin(request, companyId);
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (jobId) {
      const job = await getReindexJob(companyId, jobId);
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      return NextResponse.json({ job });
    }

    const list = searchParams.get("list") === "true";
    if (list) {
      const jobs = await listReindexJobs(companyId);
      return NextResponse.json({ jobs });
    }

    const latest = await getLatestReindexJob(companyId);
    return NextResponse.json({ job: latest });
  } catch (error) {
    console.error("Reindex job status error:", error);
    return NextResponse.json({ error: "Failed to load reindex job" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireCompanyAdmin(request, id, PERMISSIONS.REVIEW_KNOWLEDGE);
  if (session instanceof NextResponse) return session;

  try {
    const company = await db.company.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const scope = parseReindexScope((body as { scope?: string }).scope);

    const { job, reused } = await enqueueReindexJob({
      companyId: id,
      scope,
      session,
    });

    if (!reused) {
      after(async () => {
        try {
          await runReindexJob(job.id);
        } catch (error) {
          console.error("Background reindex job error:", error);
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        job,
        reused,
        message: reused
          ? "A reindex job is already in progress for this company"
          : "Reindex job queued",
      },
      { status: reused ? 200 : 202 }
    );
  } catch (error) {
    const err = error as Error;
    console.error("Knowledge reindex enqueue error:", err.message);
    return NextResponse.json(
      { error: "Failed to queue reindex", details: err.message },
      { status: 500 }
    );
  }
}
