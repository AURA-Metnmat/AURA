import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { buildInterviewReportPdf } from "@/lib/reports/interview-report-pdf";

const REPORT_SECTIONS = [
  ["Executive Summary", "executiveSummary"],
  ["Process Documentation", "processDocumentation"],
  ["Requirements", "requirements"],
  ["Pain Points", "painPointsSummary"],
  ["Integrations", "integrationSummary"],
  ["Reporting", "reportingSummary"],
  ["Risks", "risks"],
  ["Recommendations", "recommendations"],
  ["Architecture", "architecture"],
  ["Action Items", "actionItems"],
] as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id: companyId, sessionId } = await params;
  const session = await requireCompanyAdmin(request, companyId);
  if (session instanceof NextResponse) return session;

  try {
    const interview = await db.interviewSession.findFirst({
      where: { id: sessionId, companyId },
      include: {
        company: { select: { name: true, slug: true } },
        participant: {
          select: { fullName: true, department: true, designation: true },
        },
        report: true,
      },
    });

    if (!interview) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (!interview.report) {
      return NextResponse.json(
        { error: "Report not available — interview may still be in progress" },
        { status: 404 }
      );
    }

    const pdf = await buildInterviewReportPdf({
      companyName: interview.company.name,
      participantName: interview.participant?.fullName ?? null,
      department: interview.participant?.department ?? null,
      designation: interview.participant?.designation ?? null,
      completedAt: interview.completedAt?.toISOString().slice(0, 10) ?? null,
      completionPct: interview.completionPct,
      sections: REPORT_SECTIONS.map(([title, key]) => ({
        title,
        body: interview.report![key] ?? "",
      })),
    });

    const participantSlug = (interview.participant?.fullName ?? "employee")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .slice(0, 40);
    const fileName = `${interview.company.slug}-${participantSlug}-report.pdf`;

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Interview report PDF error:", error);
    return NextResponse.json({ error: "Failed to generate PDF report" }, { status: 500 });
  }
}
