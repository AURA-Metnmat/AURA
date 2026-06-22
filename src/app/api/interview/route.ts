import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { generateAuraResponse, generateInterviewReport, normalizeUserMessage } from "@/lib/aura/agent";
import { getOpeningQuestion1, getOpeningQuestion2 } from "@/lib/aura/opening-questions";
import { serializeInteraction } from "@/lib/aura/interaction";
import { resolveMessageLocale } from "@/lib/aura/message-locale";
import { loadFullCompanyContext } from "@/lib/companies/company-knowledge";
import { requireEmployeeSession } from "@/lib/auth/employee";
import { assertEmployeeOwnsSession } from "@/lib/employees/session-access";
import { findActiveSessionForEmployee } from "@/lib/employees/session-resume";
import { reindexCompanyKnowledge } from "@/lib/knowledge/indexer";
import type { Language } from "@/lib/aura/i18n";
import type { SectionId } from "@/lib/aura/config";

interface StartPayload {
  action: "start";
  companyId: string;
  language: Language;
  participant: {
    fullName: string;
    designation: string;
    department: string;
    mobile: string;
    email?: string;
  };
}

interface MessagePayload {
  sessionId: string;
  message: string;
  attachmentIds?: string[];
}

interface UpdateLanguagePayload {
  action: "updateLanguage";
  sessionId: string;
  language: Language;
}

interface CompletePayload {
  action: "complete";
  sessionId: string;
  message?: string;
}

type InterviewBody = StartPayload | MessagePayload | CompletePayload | UpdateLanguagePayload;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InterviewBody;

    if ("action" in body && body.action === "updateLanguage") {
      const { sessionId, language } = body;
      const valid: Language[] = ["en", "hi", "or", "bn"];
      if (!sessionId || !valid.includes(language)) {
        return NextResponse.json({ error: "Invalid language update" }, { status: 400 });
      }
      const session = await db.interviewSession.findUnique({
        where: { id: sessionId },
        include: { participant: true, messages: { where: { role: "assistant" } } },
      });
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      const langDenied = await assertEmployeeOwnsSession(request, session);
      if (langDenied) return langDenied;
      const participantName = session.participant?.fullName;
      for (const msg of session.messages) {
        const contentEn = msg.content;
        const contentLocale = msg.contentLocale ?? contentEn;
        const resolved = resolveMessageLocale(
          contentEn,
          contentLocale,
          language,
          participantName ?? undefined
        );
        if (resolved !== contentLocale) {
          await db.message.update({
            where: { id: msg.id },
            data: { contentLocale: resolved },
          });
        }
      }
      await db.interviewSession.update({
        where: { id: sessionId },
        data: { language },
      });
      return NextResponse.json({ ok: true, language });
    }

    if ("action" in body && body.action === "start") {
      const { participant, language, companyId } = body;

      const auth = await requireEmployeeSession(request, companyId);
      if (auth instanceof NextResponse) return auth;

      const company = await db.company.findUnique({
        where: { id: companyId, isActive: true },
      });
      if (!company) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
      }

      const employee = await db.employee.findUnique({
        where: { id: auth.session.employeeId },
      });
      if (!employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      const existing = await findActiveSessionForEmployee(employee.id, companyId);
      if (existing) {
        return NextResponse.json({
          resumed: true,
          sessionId: existing.sessionId,
          messages: existing.messages,
          message: existing.messages.at(-1)?.contentEn ?? "",
          messageLocale: existing.messages.at(-1)?.contentLocale ?? "",
          interaction: existing.messages.at(-1)?.interaction ?? null,
          currentSection: existing.currentSection,
          completionPct: existing.completionPct,
          introStep: existing.introStep,
          language: existing.language,
          interviewDurationMinutes: existing.interviewDurationMinutes,
          startedAt: existing.startedAt,
          company: { id: company.id, name: company.name },
        });
      }

      await db.employee.update({
        where: { id: employee.id },
        data: {
          designation: participant.designation.trim() || employee.designation,
          department: participant.department.trim() || employee.department,
        },
      });

      const resolvedDesignation =
        participant.designation.trim() || employee.designation?.trim() || "";

      const session = await db.interviewSession.create({
        data: {
          companyId: company.id,
          employeeId: employee.id,
          language,
          currentSection: "A",
          introStep: 1,
          completionPct: 5,
          participant: {
            create: {
              fullName: participant.fullName,
              designation: resolvedDesignation,
              department: participant.department,
              mobile: participant.mobile,
              email: participant.email || null,
              employeeId: employee.employeeCode,
              contactInfo: [participant.mobile, participant.email].filter(Boolean).join(" | "),
            },
          },
        },
        include: { participant: true },
      });

      const opening = getOpeningQuestion1(language, participant.fullName, resolvedDesignation);

      await db.message.create({
        data: {
          sessionId: session.id,
          role: "assistant",
          content: opening.en,
          contentLocale: opening.locale,
          section: "A",
        },
      });

      return NextResponse.json({
        resumed: false,
        sessionId: session.id,
        message: opening.en,
        messageLocale: opening.locale,
        currentSection: "A",
        completionPct: 5,
        interviewDurationMinutes: company.interviewDurationMinutes ?? 5,
        company: { id: company.id, name: company.name },
      });
    }

    const sessionId = "sessionId" in body ? body.sessionId : undefined;
    const session = sessionId
      ? await db.interviewSession.findUnique({
          where: { id: sessionId },
          include: {
            company: true,
            participant: true,
            messages: { orderBy: { createdAt: "asc" } },
          },
        })
      : null;

    if (!session && !("action" in body && body.action === "complete")) {
      return NextResponse.json({ error: "Session required" }, { status: 400 });
    }

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const denied = await assertEmployeeOwnsSession(request, session);
    if (denied) return denied;

    if ("action" in body && body.action === "complete") {
      const fullSession = await db.interviewSession.findUnique({
        where: { id: session.id },
        include: {
          company: true,
          participant: true,
          messages: { orderBy: { createdAt: "asc" } },
          attachments: true,
          processes: true,
          painPoints: true,
          requirements: true,
        },
      });

      if (!fullSession) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      const reportData = await generateInterviewReport({
        company: fullSession.company
          ? {
              name: fullSession.company.name,
              industry: fullSession.company.industry,
              description: fullSession.company.description,
              aiContext: fullSession.company.aiContext,
            }
          : null,
        participant: fullSession.participant as Record<string, unknown> | null,
        messages: fullSession.messages,
        processes: fullSession.processes as Record<string, unknown>[],
        painPoints: fullSession.painPoints as Record<string, unknown>[],
        requirements: fullSession.requirements as Record<string, unknown>[],
      });

      await db.interviewReport.upsert({
        where: { sessionId: session.id },
        create: {
          sessionId: session.id,
          executiveSummary: reportData.executiveSummary ?? "",
          processDocumentation: reportData.processDocumentation ?? "",
          requirements: reportData.requirements ?? "",
          painPointsSummary: reportData.painPointsSummary ?? "",
          integrationSummary: reportData.integrationSummary ?? "",
          reportingSummary: reportData.reportingSummary ?? "",
          risks: reportData.risks ?? "",
          recommendations: reportData.recommendations ?? "",
          architecture: reportData.architecture ?? "",
          actionItems: reportData.actionItems ?? "",
        },
        update: {
          executiveSummary: reportData.executiveSummary ?? "",
          processDocumentation: reportData.processDocumentation ?? "",
          requirements: reportData.requirements ?? "",
          painPointsSummary: reportData.painPointsSummary ?? "",
          integrationSummary: reportData.integrationSummary ?? "",
          reportingSummary: reportData.reportingSummary ?? "",
          risks: reportData.risks ?? "",
          recommendations: reportData.recommendations ?? "",
          architecture: reportData.architecture ?? "",
          actionItems: reportData.actionItems ?? "",
        },
      });

      await db.interviewSession.update({
        where: { id: session.id },
        data: { status: "completed", completedAt: new Date(), completionPct: 100 },
      });

      if (fullSession.company) {
        void reindexCompanyKnowledge({
          companySlug: fullSession.company.slug,
          companyId: fullSession.company.id,
          scope: "experience",
        }).catch((err) => console.error("Experience knowledge reindex failed:", err));
      }

      return NextResponse.json({ sessionId: session.id, report: reportData, completed: true });
    }

    if (!("message" in body)) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const userMessage = body.message?.trim();
    if (!userMessage) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const attachmentIds = body.attachmentIds ?? [];
    const attachments =
      attachmentIds.length > 0
        ? await db.messageAttachment.findMany({
            where: { id: { in: attachmentIds }, sessionId: session.id },
          })
        : [];

    let messageContent = userMessage;
    if (attachments.length > 0) {
      const fileList = attachments.map((a) => `[${a.fileName}]`).join(" ");
      messageContent = `${userMessage}\n\n📎 ${fileList}`;

      const extractedParts = attachments
        .filter((a) => a.extractedText?.trim())
        .map(
          (a) => `--- ${a.fileName} ---\n${a.extractedText!.trim().slice(0, 8000)}`
        );

      if (extractedParts.length > 0) {
        messageContent += `\n\n[Attached file contents]\n${extractedParts.join("\n\n")}`;
      }
    }

    const lang = (session.language as Language) || "en";

    const userBilingual = await normalizeUserMessage(messageContent, lang);

    const userMsg = await db.message.create({
      data: {
        sessionId: session.id,
        role: "user",
        content: userBilingual.en,
        contentLocale: userBilingual.locale,
        section: session.currentSection,
      },
    });

    if (attachments.length > 0) {
      await db.messageAttachment.updateMany({
        where: { id: { in: attachments.map((a) => a.id) } },
        data: { messageId: userMsg.id },
      });
    }

    await extractStructuredData(
      session.id,
      session.currentSection as SectionId,
      userMessage
    );

    const updatedHistory = [
      ...session.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: userBilingual.en },
    ];

    const introStep = session.introStep ?? 1;

    if (introStep === 1) {
      const opening2 = getOpeningQuestion2(lang, session.company.name);
      const metadata = opening2.interaction
        ? serializeInteraction(opening2.interaction)
        : null;
      await db.message.create({
        data: {
          sessionId: session.id,
          role: "assistant",
          content: opening2.en,
          contentLocale: opening2.locale,
          metadata,
          section: "A",
        },
      });
      await db.interviewSession.update({
        where: { id: session.id },
        data: { introStep: 2, completionPct: 10 },
      });
      return NextResponse.json({
        sessionId: session.id,
        message: opening2.en,
        messageLocale: opening2.locale,
        interaction: opening2.interaction ?? null,
        userMessageEn: userBilingual.en,
        userMessageLocale: userBilingual.locale,
        currentSection: "A",
        completionPct: 10,
        shouldComplete: false,
      });
    }

    const companyCtx = await loadFullCompanyContext({
      name: session.company.name,
      industry: session.company.industry,
      description: session.company.description,
      aiContext: session.company.aiContext,
      slug: session.company.slug,
    });

    const postIntro = introStep === 2;
    const activeSection = postIntro ? ("B" as SectionId) : (session.currentSection as SectionId);

    const response = await generateAuraResponse(
      {
        sessionId: session.id,
        language: lang,
        company: companyCtx,
        currentSection: activeSection,
        stakeholderType: session.stakeholderType,
        participant: session.participant,
        messageHistory: updatedHistory,
        questionIndex: 0,
        postIntro,
      },
      userBilingual.en
    );

    await db.message.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: response.content,
        contentLocale: response.contentLocale,
        metadata: response.metadata ?? null,
        section: response.nextSection,
      },
    });

    await db.interviewSession.update({
      where: { id: session.id },
      data: {
        introStep: Math.max(introStep, 3),
        currentSection: response.nextSection,
        completionPct: response.completionPct,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      message: response.content,
      messageLocale: response.contentLocale,
      interaction: response.interaction ?? null,
      userMessageEn: userBilingual.en,
      userMessageLocale: userBilingual.locale,
      currentSection: response.nextSection,
      completionPct: response.completionPct,
      shouldComplete: response.shouldComplete,
    });
  } catch (error) {
    console.error("Interview API error:", error);
    return NextResponse.json({ error: "Interview processing failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    const sessions = await db.interviewSession.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      include: { participant: true, company: true, report: true },
    });
    return NextResponse.json({ sessions });
  }

  const session = await db.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      company: true,
      participant: true,
      messages: {
        orderBy: { createdAt: "asc" },
        include: { attachments: true },
      },
      attachments: true,
      processes: true,
      painPoints: true,
      requirements: true,
      integrations: true,
      reporting: true,
      approvals: true,
      report: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ session });
}

async function extractStructuredData(
  sessionId: string,
  section: SectionId,
  message: string
): Promise<void> {
  const lower = message.toLowerCase();

  if (section === "E" && (lower.includes("delay") || lower.includes("problem") || lower.includes("issue") || lower.includes("bottleneck") || lower.includes("समस्या") || lower.includes("ସମସ୍ୟା") || lower.includes("সমস্যা"))) {
    await db.painPoint.create({
      data: {
        sessionId,
        title: message.slice(0, 100),
        description: message,
        severity: lower.includes("critical") || lower.includes("major") ? "high" : "medium",
      },
    });
  }

  if (section === "F" && (lower.includes("should") || lower.includes("need") || lower.includes("must") || lower.includes("system") || lower.includes("चाहिए") || lower.includes("ଦରକାର") || lower.includes("দরকার"))) {
    await db.requirement.create({
      data: {
        sessionId,
        type: lower.includes("security") || lower.includes("performance") ? "non_functional" : "functional",
        title: message.slice(0, 100),
        description: message,
      },
    });
  }

  if (section === "H" && (lower.includes("sap") || lower.includes("erp") || lower.includes("integrat") || lower.includes("excel"))) {
    await db.integrationReq.create({
      data: {
        sessionId,
        systemName: message.slice(0, 80),
        purpose: message,
      },
    });
  }
}
