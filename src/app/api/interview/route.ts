import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { generateAuraResponse, generateInterviewReport } from "@/lib/aura/agent";
import { getWelcomeMessage, type Language } from "@/lib/aura/i18n";
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

interface CompletePayload {
  action: "complete";
  sessionId: string;
  message?: string;
}

type InterviewBody = StartPayload | MessagePayload | CompletePayload;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InterviewBody;

    if ("action" in body && body.action === "start") {
      const { participant, language, companyId } = body;

      const company = await db.company.findUnique({
        where: { id: companyId, isActive: true },
      });
      if (!company) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
      }

      const session = await db.interviewSession.create({
        data: {
          companyId: company.id,
          language,
          currentSection: "B",
          completionPct: 10,
          participant: {
            create: {
              fullName: participant.fullName,
              designation: participant.designation,
              department: participant.department,
              mobile: participant.mobile,
              email: participant.email || null,
              contactInfo: [participant.mobile, participant.email].filter(Boolean).join(" | "),
            },
          },
        },
        include: { participant: true },
      });

      const welcomeMessage = getWelcomeMessage(
        language,
        participant.fullName,
        participant.designation,
        company.name
      );

      await db.message.create({
        data: {
          sessionId: session.id,
          role: "assistant",
          content: welcomeMessage,
          section: "B",
        },
      });

      return NextResponse.json({
        sessionId: session.id,
        message: welcomeMessage,
        currentSection: "B",
        completionPct: 10,
        company: { id: company.id, name: company.name },
      });
    }

    const sessionId = "sessionId" in body ? body.sessionId : undefined;
    let session = sessionId
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
    }

    const userMsg = await db.message.create({
      data: {
        sessionId: session.id,
        role: "user",
        content: messageContent,
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

    const lang = (session.language as Language) || "en";
    const updatedHistory = [
      ...session.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: messageContent },
    ];

    const response = await generateAuraResponse(
      {
        sessionId: session.id,
        language: lang,
        company: {
          name: session.company.name,
          industry: session.company.industry,
          description: session.company.description,
          aiContext: session.company.aiContext,
        },
        currentSection: session.currentSection as SectionId,
        stakeholderType: session.stakeholderType,
        participant: session.participant,
        messageHistory: updatedHistory,
        questionIndex: 0,
      },
      userMessage
    );

    await db.message.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: response.content,
        section: response.nextSection,
      },
    });

    await db.interviewSession.update({
      where: { id: session.id },
      data: {
        currentSection: response.nextSection,
        completionPct: response.completionPct,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      message: response.content,
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

  if (section === "E" && (lower.includes("delay") || lower.includes("problem") || lower.includes("issue") || lower.includes("bottleneck") || lower.includes("समस्या") || lower.includes("ସମସ୍ୟା"))) {
    await db.painPoint.create({
      data: {
        sessionId,
        title: message.slice(0, 100),
        description: message,
        severity: lower.includes("critical") || lower.includes("major") ? "high" : "medium",
      },
    });
  }

  if (section === "F" && (lower.includes("should") || lower.includes("need") || lower.includes("must") || lower.includes("system") || lower.includes("चाहिए") || lower.includes("ଦରକାର"))) {
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
