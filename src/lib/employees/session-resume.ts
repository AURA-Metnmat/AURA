import { db } from "@/lib/db";
import type { Language } from "@/lib/aura/i18n";

export interface ResumedSessionPayload {
  sessionId: string;
  language: Language;
  currentSection: string;
  completionPct: number;
  introStep: number;
  interviewDurationMinutes: number;
  messages: {
    role: "user" | "assistant";
    contentEn: string;
    contentLocale: string;
  }[];
  participant: {
    fullName: string;
    designation: string;
    department: string;
    mobile: string;
    email: string;
  };
  startedAt: string;
}

export async function findActiveSessionForEmployee(
  employeeId: string,
  companyId: string
): Promise<ResumedSessionPayload | null> {
  const session = await db.interviewSession.findFirst({
    where: {
      employeeId,
      companyId,
      status: "active",
    },
    orderBy: { updatedAt: "desc" },
    include: {
      company: true,
      participant: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session || session.messages.length === 0) {
    return null;
  }

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return null;

  const p = session.participant;

  return {
    sessionId: session.id,
    language: session.language as Language,
    currentSection: session.currentSection,
    completionPct: session.completionPct,
    introStep: session.introStep,
    interviewDurationMinutes: session.company.interviewDurationMinutes ?? 5,
    messages: session.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      contentEn: m.content,
      contentLocale: m.contentLocale ?? m.content,
    })),
    participant: {
      fullName: p?.fullName ?? employee.employeeName,
      designation: p?.designation ?? employee.designation ?? "",
      department: p?.department ?? employee.department ?? "",
      mobile: p?.mobile ?? employee.mobileNumber,
      email: p?.email ?? employee.email ?? "",
    },
    startedAt: session.startedAt.toISOString(),
  };
}
