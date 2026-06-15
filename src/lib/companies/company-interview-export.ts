import * as XLSX from "xlsx";
import { db } from "@/lib/db";

function formatDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString();
}

function sheetFromRows<T extends Record<string, unknown>>(
  rows: T[],
  headers: { key: keyof T; label: string }[]
): XLSX.WorkSheet {
  const data = [
    headers.map((h) => h.label),
    ...rows.map((row) => headers.map((h) => {
      const val = row[h.key];
      if (val === null || val === undefined) return "";
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    })),
  ];
  return XLSX.utils.aoa_to_sheet(data);
}

export async function buildCompanyInterviewWorkbook(companyId: string): Promise<{
  buffer: Buffer;
  fileName: string;
}> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      sessions: {
        orderBy: { startedAt: "desc" },
        include: {
          participant: true,
          messages: { orderBy: { createdAt: "asc" } },
          processes: true,
          painPoints: true,
          requirements: true,
          integrations: true,
          reporting: true,
          approvals: true,
          report: true,
        },
      },
    },
  });

  if (!company) {
    throw new Error("Company not found");
  }

  const wb = XLSX.utils.book_new();
  const slug = company.slug.replace(/[^a-z0-9-_]/gi, "-");

  const summaryRows = company.sessions.map((s) => ({
    sessionId: s.id,
    employee: s.participant?.fullName ?? "",
    designation: s.participant?.designation ?? "",
    department: s.participant?.department ?? "",
    mobile: s.participant?.mobile ?? "",
    email: s.participant?.email ?? "",
    status: s.status,
    language: s.language,
    completionPct: s.completionPct,
    currentSection: s.currentSection,
    startedAt: formatDate(s.startedAt),
    completedAt: formatDate(s.completedAt),
    hasReport: s.report ? "Yes" : "No",
    messageCount: s.messages.length,
    processCount: s.processes.length,
    painPointCount: s.painPoints.length,
    requirementCount: s.requirements.length,
  }));

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(summaryRows, [
      { key: "sessionId", label: "Session ID" },
      { key: "employee", label: "Employee" },
      { key: "designation", label: "Designation" },
      { key: "department", label: "Department" },
      { key: "mobile", label: "Mobile" },
      { key: "email", label: "Email" },
      { key: "status", label: "Status" },
      { key: "language", label: "Language" },
      { key: "completionPct", label: "Completion %" },
      { key: "currentSection", label: "Section" },
      { key: "startedAt", label: "Started At" },
      { key: "completedAt", label: "Completed At" },
      { key: "hasReport", label: "Report Generated" },
      { key: "messageCount", label: "Messages" },
      { key: "processCount", label: "Processes" },
      { key: "painPointCount", label: "Pain Points" },
      { key: "requirementCount", label: "Requirements" },
    ]),
    "Interview Summary"
  );

  const messageRows = company.sessions.flatMap((s) =>
    s.messages.map((m) => ({
      sessionId: s.id,
      employee: s.participant?.fullName ?? "",
      role: m.role,
      section: m.section ?? "",
      content: m.content,
      createdAt: formatDate(m.createdAt),
    }))
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(messageRows, [
      { key: "sessionId", label: "Session ID" },
      { key: "employee", label: "Employee" },
      { key: "role", label: "Role" },
      { key: "section", label: "Section" },
      { key: "content", label: "Content" },
      { key: "createdAt", label: "Timestamp" },
    ]),
    "Conversations"
  );

  const processRows = company.sessions.flatMap((s) =>
    s.processes.map((p) => ({
      sessionId: s.id,
      employee: s.participant?.fullName ?? "",
      processName: p.processName,
      objective: p.objective ?? "",
      triggerEvent: p.triggerEvent ?? "",
      steps: p.steps ?? "",
      processOwner: p.processOwner ?? "",
      toolsUsed: p.toolsUsed ?? "",
      frequency: p.frequency ?? "",
    }))
  );

  if (processRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows(processRows, [
        { key: "sessionId", label: "Session ID" },
        { key: "employee", label: "Employee" },
        { key: "processName", label: "Process Name" },
        { key: "objective", label: "Objective" },
        { key: "triggerEvent", label: "Trigger" },
        { key: "steps", label: "Steps" },
        { key: "processOwner", label: "Owner" },
        { key: "toolsUsed", label: "Tools" },
        { key: "frequency", label: "Frequency" },
      ]),
      "Processes"
    );
  }

  const painRows = company.sessions.flatMap((s) =>
    s.painPoints.map((p) => ({
      sessionId: s.id,
      employee: s.participant?.fullName ?? "",
      title: p.title,
      description: p.description ?? "",
      category: p.category ?? "",
      severity: p.severity,
      impact: p.impact ?? "",
    }))
  );

  if (painRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows(painRows, [
        { key: "sessionId", label: "Session ID" },
        { key: "employee", label: "Employee" },
        { key: "title", label: "Title" },
        { key: "description", label: "Description" },
        { key: "category", label: "Category" },
        { key: "severity", label: "Severity" },
        { key: "impact", label: "Impact" },
      ]),
      "Pain Points"
    );
  }

  const reqRows = company.sessions.flatMap((s) =>
    s.requirements.map((r) => ({
      sessionId: s.id,
      employee: s.participant?.fullName ?? "",
      type: r.type,
      title: r.title,
      description: r.description ?? "",
      priority: r.priority,
    }))
  );

  if (reqRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows(reqRows, [
        { key: "sessionId", label: "Session ID" },
        { key: "employee", label: "Employee" },
        { key: "type", label: "Type" },
        { key: "title", label: "Title" },
        { key: "description", label: "Description" },
        { key: "priority", label: "Priority" },
      ]),
      "Requirements"
    );
  }

  const integrationRows = company.sessions.flatMap((s) =>
    s.integrations.map((i) => ({
      sessionId: s.id,
      employee: s.participant?.fullName ?? "",
      systemName: i.systemName,
      purpose: i.purpose ?? "",
      dataFlow: i.dataFlow ?? "",
      frequency: i.frequency ?? "",
      direction: i.direction ?? "",
    }))
  );

  if (integrationRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows(integrationRows, [
        { key: "sessionId", label: "Session ID" },
        { key: "employee", label: "Employee" },
        { key: "systemName", label: "System" },
        { key: "purpose", label: "Purpose" },
        { key: "dataFlow", label: "Data Flow" },
        { key: "frequency", label: "Frequency" },
        { key: "direction", label: "Direction" },
      ]),
      "Integrations"
    );
  }

  const reportRows = company.sessions
    .filter((s) => s.report)
    .map((s) => ({
      sessionId: s.id,
      employee: s.participant?.fullName ?? "",
      executiveSummary: s.report!.executiveSummary,
      requirements: s.report!.requirements,
      painPointsSummary: s.report!.painPointsSummary,
      integrationSummary: s.report!.integrationSummary,
      reportingSummary: s.report!.reportingSummary,
      risks: s.report!.risks,
      recommendations: s.report!.recommendations,
      architecture: s.report!.architecture,
      actionItems: s.report!.actionItems,
      generatedAt: formatDate(s.report!.createdAt),
    }));

  if (reportRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      sheetFromRows(reportRows, [
        { key: "sessionId", label: "Session ID" },
        { key: "employee", label: "Employee" },
        { key: "executiveSummary", label: "Executive Summary" },
        { key: "requirements", label: "Requirements" },
        { key: "painPointsSummary", label: "Pain Points" },
        { key: "integrationSummary", label: "Integrations" },
        { key: "reportingSummary", label: "Reporting" },
        { key: "risks", label: "Risks" },
        { key: "recommendations", label: "Recommendations" },
        { key: "architecture", label: "Architecture" },
        { key: "actionItems", label: "Action Items" },
        { key: "generatedAt", label: "Generated At" },
      ]),
      "Reports"
    );
  }

  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const date = new Date().toISOString().slice(0, 10);
  return {
    buffer: out,
    fileName: `${slug}-interview-data-${date}.xlsx`,
  };
}

export async function getCompanyGatheredData(companyId: string) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      sessions: {
        orderBy: { startedAt: "desc" },
        include: {
          participant: true,
          messages: { orderBy: { createdAt: "asc" }, take: 3 },
          _count: {
            select: {
              messages: true,
              processes: true,
              painPoints: true,
              requirements: true,
              integrations: true,
              reporting: true,
              approvals: true,
            },
          },
          processes: true,
          painPoints: true,
          requirements: true,
          integrations: true,
          reporting: true,
          approvals: true,
          report: true,
        },
      },
    },
  });

  if (!company) return null;

  return {
    company: {
      id: company.id,
      slug: company.slug,
      name: company.name,
    },
    sessions: company.sessions.map((s) => ({
      id: s.id,
      status: s.status,
      completionPct: s.completionPct,
      language: s.language,
      currentSection: s.currentSection,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      participant: s.participant,
      counts: s._count,
      recentMessages: s.messages,
      processes: s.processes,
      painPoints: s.painPoints,
      requirements: s.requirements,
      integrations: s.integrations,
      reporting: s.reporting,
      approvals: s.approvals,
      report: s.report
        ? {
            id: s.report.id,
            executiveSummary: s.report.executiveSummary,
            requirements: s.report.requirements,
            painPointsSummary: s.report.painPointsSummary,
            recommendations: s.report.recommendations,
            actionItems: s.report.actionItems,
            createdAt: s.report.createdAt,
          }
        : null,
    })),
    totals: {
      sessions: company.sessions.length,
      completed: company.sessions.filter((s) => s.status === "completed").length,
      processes: company.sessions.reduce((n, s) => n + s.processes.length, 0),
      painPoints: company.sessions.reduce((n, s) => n + s.painPoints.length, 0),
      requirements: company.sessions.reduce((n, s) => n + s.requirements.length, 0),
      integrations: company.sessions.reduce((n, s) => n + s.integrations.length, 0),
      reports: company.sessions.filter((s) => s.report).length,
    },
  };
}
