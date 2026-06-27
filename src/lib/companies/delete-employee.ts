import { db } from "@/lib/db";
import { deleteStoredFile } from "@/lib/storage";

export type DeleteEmployeeSummary = {
  mode: "employee" | "session";
  employeeName: string | null;
  sessionsDeleted: number;
  filesDeleted: number;
};

/**
 * Delete an employee and ALL their interview data, scoped to one company.
 *
 * Given a session id: if that session is linked to an employee, delete the
 * employee account plus every session of theirs in this company (cascading to
 * messages, answers, attachments, processes, pain points, requirements, the
 * report, etc.), their uploaded files in storage, and the RAG chunks derived
 * from their interviews. If the session has no linked employee (anonymous /
 * token-only), just that one session is removed.
 *
 * DB deletes run in one array-form $transaction (PgBouncer-safe). Storage
 * deletes are external and best-effort. Returns null if the session isn't found
 * in this company.
 */
export async function deleteEmployeeOrSession(
  companyId: string,
  sessionId: string
): Promise<DeleteEmployeeSummary | null> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { slug: true },
  });
  if (!company) return null;

  const target = await db.interviewSession.findFirst({
    where: { id: sessionId, companyId },
    select: {
      id: true,
      employeeId: true,
      employee: { select: { employeeName: true } },
      participant: { select: { fullName: true } },
    },
  });
  if (!target) return null;

  // The set of sessions to remove: all of the employee's, or just this one.
  const sessions = await db.interviewSession.findMany({
    where: target.employeeId
      ? { companyId, employeeId: target.employeeId }
      : { id: sessionId, companyId },
    select: { id: true, attachments: { select: { storageKey: true } } },
  });

  const sessionIds = sessions.map((s) => s.id);
  const storageKeys = [
    ...new Set(
      sessions
        .flatMap((s) => s.attachments)
        .map((a) => a.storageKey)
        .filter((k): k is string => Boolean(k))
    ),
  ];

  // Answer ids — so the RAG chunks derived from those answers can be removed.
  const answerIds = (
    await db.interviewAnswer.findMany({
      where: { sessionId: { in: sessionIds } },
      select: { id: true },
    })
  ).map((a) => a.id);

  // External storage deletes (best-effort, outside the DB transaction).
  for (const key of storageKeys) {
    try {
      await deleteStoredFile(key);
    } catch (error) {
      console.error(`Failed to delete storage file ${key}:`, error);
    }
  }

  await db.$transaction([
    db.knowledgeChunk.deleteMany({
      where: { companySlug: company.slug, sourceId: { in: [...sessionIds, ...answerIds] } },
    }),
    // Cascades to messages, answers, attachments, processes, pain points,
    // requirements, integrations, reporting, approvals, and the report.
    db.interviewSession.deleteMany({ where: { id: { in: sessionIds } } }),
    // Cascades auth logs; nulls OTP rows.
    ...(target.employeeId
      ? [db.employee.delete({ where: { id: target.employeeId } })]
      : []),
  ]);

  return {
    mode: target.employeeId ? "employee" : "session",
    employeeName: target.employee?.employeeName ?? target.participant?.fullName ?? null,
    sessionsDeleted: sessionIds.length,
    filesDeleted: storageKeys.length,
  };
}
