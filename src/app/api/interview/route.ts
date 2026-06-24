import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/admin";
import { assertCompanyAccess, companyScopeFilter } from "@/lib/auth/admin-rbac";
import { generateInterviewReport, normalizeUserMessage } from "@/lib/aura/agent";
import { getOpeningQuestion1, getOpeningQuestion2 } from "@/lib/aura/opening-questions";
import { serializeInteraction } from "@/lib/aura/interaction";
import { resolveMessageLocale } from "@/lib/aura/message-locale";
import { requireEmployeeSession } from "@/lib/auth/employee";
import { assertEmployeeOwnsSession } from "@/lib/employees/session-access";
import { findActiveSessionForEmployee } from "@/lib/employees/session-resume";
import { reindexCompanyKnowledge } from "@/lib/knowledge/indexer";
import { sanitizeUserInput, containsPromptInjectionSignals } from "@/lib/ai/safety";
import { CONSENT_VERSION, type DeviceType } from "@/lib/interview/consent";
import { captureUserAnswer, findLastAssistantMessageId } from "@/lib/interview/answer-capture";
import type { StructuredAnswerPayload } from "@/lib/aura/interaction";
import { resolveCampaignForCompany } from "@/lib/campaigns/resolve";
import {
  buildPhaseConfig,
  INTERVIEW_COMPLETE_MIN_PCT,
  isPhase2InterviewComplete,
} from "@/lib/interview/phase-config";
import { handlePostIntroInterviewTurn } from "@/lib/interview/handle-interview-turn";
import { advanceInterviewPhase } from "@/lib/interview/phase-advance";
import { countActivePhase2Questions } from "@/lib/interview/phase2-runner";
import { buildInterviewPhaseMeta } from "@/lib/interview/phase-response";
import type { Language } from "@/lib/aura/i18n";
import type { SectionId } from "@/lib/aura/config";

interface StartPayload {
  action: "start";
  companyId: string;
  language: Language;
  campaignId?: string;
  consentAccepted?: boolean;
  consentVersion?: string;
  deviceType?: DeviceType;
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
  structuredAnswer?: StructuredAnswerPayload;
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

interface AdvancePhasePayload {
  action: "advancePhase";
  sessionId: string;
  trigger: "timer" | "start_phase2";
}

type InterviewBody =
  | StartPayload
  | MessagePayload
  | CompletePayload
  | UpdateLanguagePayload
  | AdvancePhasePayload;

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

    if ("action" in body && body.action === "advancePhase") {
      const { sessionId, trigger } = body;
      if (!sessionId || (trigger !== "timer" && trigger !== "start_phase2")) {
        return NextResponse.json({ error: "Invalid phase advance request" }, { status: 400 });
      }

      const session = await db.interviewSession.findUnique({
        where: { id: sessionId },
        include: { company: true, participant: true },
      });
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      const denied = await assertEmployeeOwnsSession(request, session);
      if (denied) return denied;

      const lang = (session.language as Language) || "en";
      const advanced = await advanceInterviewPhase({
        session: {
          id: session.id,
          companyId: session.companyId,
          interviewPhase: session.interviewPhase,
          phase2QuestionIndex: session.phase2QuestionIndex,
          phase1StartedAt: session.phase1StartedAt,
          phase2StartedAt: session.phase2StartedAt,
          startedAt: session.startedAt,
          currentSection: session.currentSection,
          completionPct: session.completionPct,
          introStep: session.introStep ?? 1,
          company: session.company,
        },
        lang,
        trigger,
      });

      if (!advanced) {
        return NextResponse.json({ ok: false, phaseEvent: "not_ready" });
      }

      return NextResponse.json({ ok: true, ...advanced });
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
          interviewPhase: existing.interviewPhase,
          phase1Title: existing.phase1Title,
          phase2Title: existing.phase2Title,
          phase2Enabled: existing.phase2Enabled,
          phaseProgress: existing.phaseProgress,
          phase2QuestionNumber: existing.phase2QuestionNumber,
          phase2QuestionTotal: existing.phase2QuestionTotal,
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

      if (!body.consentAccepted) {
        return NextResponse.json(
          { error: "Interview consent is required before starting." },
          { status: 400 }
        );
      }

      const resolvedCampaign = await resolveCampaignForCompany(companyId, body.campaignId);
      if (!resolvedCampaign) {
        return NextResponse.json(
          { error: "Interview campaign is not available or has expired." },
          { status: 403 }
        );
      }

      const clientUserAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

      const session = await db.interviewSession.create({
        data: {
          companyId: company.id,
          employeeId: employee.id,
          campaignId: resolvedCampaign.id,
          language,
          currentSection: "A",
          introStep: 1,
          questionIndex: 0,
          completionPct: 5,
          consentAcceptedAt: new Date(),
          consentVersion: body.consentVersion?.trim() || CONSENT_VERSION,
          deviceType: body.deviceType ?? "desktop",
          clientUserAgent,
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

      const phaseConfig = buildPhaseConfig(company);
      const phaseMeta = await buildInterviewPhaseMeta({
        companyId: company.id,
        company,
        interviewPhase: session.interviewPhase,
        phase2QuestionIndex: session.phase2QuestionIndex,
        phase1StartedAt: session.phase1StartedAt,
        phase2StartedAt: session.phase2StartedAt,
        startedAt: session.startedAt,
      });

      return NextResponse.json({
        resumed: false,
        sessionId: session.id,
        campaignId: resolvedCampaign.id,
        message: opening.en,
        messageLocale: opening.locale,
        currentSection: "A",
        completionPct: 5,
        interviewDurationMinutes: phaseConfig.totalDurationMinutes,
        phase1Title: phaseMeta.phase1Title,
        phase2Title: phaseMeta.phase2Title,
        phase2Enabled: phaseMeta.phase2Enabled,
        interviewPhase: phaseMeta.interviewPhase,
        phaseProgress: phaseMeta.phaseProgress,
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
            messages: { orderBy: { createdAt: "desc" }, take: 40 },
          },
        })
      : null;

    const sessionMessages =
      session?.messages.slice().sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      ) ?? [];

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

      const phase2QuestionCount = fullSession.company
        ? await countActivePhase2Questions(fullSession.companyId)
        : 0;
      const phase2Complete = isPhase2InterviewComplete({
        interviewPhase: fullSession.interviewPhase,
        phase2QuestionIndex: fullSession.phase2QuestionIndex,
        phase2QuestionCount,
      });

      if (fullSession.completionPct < INTERVIEW_COMPLETE_MIN_PCT && !phase2Complete) {
        return NextResponse.json(
          { error: "Please continue the interview — you have not reached enough progress to finish." },
          { status: 400 }
        );
      }

      const answerCount = await db.interviewAnswer.count({
        where: { sessionId: session.id },
      });
      if (answerCount < 3) {
        return NextResponse.json(
          { error: "Please answer at least a few questions before finishing." },
          { status: 400 }
        );
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

    const userMessage = sanitizeUserInput(body.message ?? "");
    if (!userMessage) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    if (containsPromptInjectionSignals(userMessage)) {
      console.warn("[interview] Prompt injection signal detected", { sessionId: session.id });
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

    const structuredAnswer = "structuredAnswer" in body ? body.structuredAnswer : undefined;
    const assistantMessageId = findLastAssistantMessageId(
      sessionMessages.map((m) => ({
        id: m.id,
        role: m.role,
        metadata: m.metadata,
      }))
    );

    await Promise.all([
      captureUserAnswer({
        sessionId: session.id,
        messageId: userMsg.id,
        assistantMessageId,
        section: session.currentSection,
        rawText: userBilingual.en,
        rawTextLocale: userBilingual.locale,
        structured: structuredAnswer?.interactionType ? structuredAnswer : null,
      }),
      extractStructuredData(
        session.id,
        session.currentSection as SectionId,
        userMessage,
        Boolean(structuredAnswer?.interactionType)
      ),
    ]);

    const updatedHistory = [
      ...sessionMessages.map((m) => ({
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
      const phaseMeta = await buildInterviewPhaseMeta({
        companyId: session.companyId,
        company: session.company,
        interviewPhase: session.interviewPhase,
        phase2QuestionIndex: session.phase2QuestionIndex,
        phase1StartedAt: session.phase1StartedAt,
        phase2StartedAt: session.phase2StartedAt,
        startedAt: session.startedAt,
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
        interviewPhase: phaseMeta.interviewPhase,
        phase1Title: phaseMeta.phase1Title,
        phase2Title: phaseMeta.phase2Title,
        phase2Enabled: phaseMeta.phase2Enabled,
        phaseProgress: phaseMeta.phaseProgress,
        phase2QuestionNumber: phaseMeta.phase2QuestionNumber,
        phase2QuestionTotal: phaseMeta.phase2QuestionTotal,
      });
    }

    const turnResult = await handlePostIntroInterviewTurn({
      session: {
        id: session.id,
        companyId: session.companyId,
        interviewPhase: session.interviewPhase,
        phase2QuestionIndex: session.phase2QuestionIndex,
        phase1StartedAt: session.phase1StartedAt,
        phase2StartedAt: session.phase2StartedAt,
        startedAt: session.startedAt,
        currentSection: session.currentSection,
        questionIndex: session.questionIndex,
        completionPct: session.completionPct,
        stakeholderType: session.stakeholderType,
        company: session.company,
        participant: session.participant
          ? {
              fullName: session.participant.fullName ?? "",
              designation: session.participant.designation,
              department: session.participant.department,
            }
          : null,
      },
      lang,
      userBilingual,
      updatedHistory,
      introStep,
    });

    return NextResponse.json(turnResult);
  } catch (error) {
    console.error("Interview API error:", error);
    return NextResponse.json({ error: "Interview processing failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const adminSession = await requireAdminSession(request);
  if (adminSession instanceof NextResponse) return adminSession;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const companyIdParam = searchParams.get("companyId");
  const scope = companyScopeFilter(adminSession);

  if (scope.id === "__none__") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId =
    companyIdParam ?? (scope.id && scope.id !== "__none__" ? scope.id : null);

  if (!companyId) {
    return NextResponse.json(
      { error: "companyId query parameter is required" },
      { status: 400 }
    );
  }

  const denied = assertCompanyAccess(adminSession, companyId);
  if (denied) return denied;

  if (!sessionId) {
    const sessions = await db.interviewSession.findMany({
      where: { companyId },
      orderBy: { startedAt: "desc" },
      take: 50,
      include: { participant: true, company: true, report: true },
    });
    return NextResponse.json({ sessions });
  }

  const interviewSession = await db.interviewSession.findUnique({
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

  if (!interviewSession || interviewSession.companyId !== companyId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ session: interviewSession });
}

async function extractStructuredData(
  sessionId: string,
  section: SectionId,
  message: string,
  hadStructuredAnswer: boolean
): Promise<void> {
  if (hadStructuredAnswer || message.trim().length < 40) {
    return;
  }

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

  if (
    section === "C" &&
    message.length > 40 &&
    (lower.includes("process") ||
      lower.includes("step") ||
      lower.includes("workflow") ||
      lower.includes("procedure") ||
      lower.includes("प्रक्रिया") ||
      lower.includes("ପ୍ରକ୍ରିୟା"))
  ) {
    const existing = await db.processRecord.count({ where: { sessionId } });
    if (existing < 12) {
      await db.processRecord.create({
        data: {
          sessionId,
          processName: message.slice(0, 120),
          objective: message,
          steps: message,
        },
      });
    }
  }

  if (
    section === "G" &&
    (lower.includes("report") ||
      lower.includes("kpi") ||
      lower.includes("dashboard") ||
      lower.includes("metric") ||
      lower.includes("रिपोर्ट"))
  ) {
    const existing = await db.reportingReq.count({ where: { sessionId } });
    if (existing < 8) {
      await db.reportingReq.create({
        data: {
          sessionId,
          reportName: message.slice(0, 100),
          kpis: message,
          frequency: lower.includes("daily")
            ? "daily"
            : lower.includes("weekly")
              ? "weekly"
              : lower.includes("monthly")
                ? "monthly"
                : "as_needed",
        },
      });
    }
  }
}
