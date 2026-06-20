import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storeInterviewFile } from "@/lib/storage";
import { assertEmployeeOwnsSession } from "@/lib/employees/session-access";
import { extractAttachmentText } from "@/lib/interview/attachment-processing";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sessionId = formData.get("sessionId") as string | null;

    if (!file || !sessionId) {
      return NextResponse.json({ error: "File and sessionId required" }, { status: 400 });
    }

    const session = await db.interviewSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const denied = await assertEmployeeOwnsSession(request, session);
    if (denied) return denied;

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File type not supported" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeInterviewFile(
      sessionId,
      file.name,
      file.type || "application/octet-stream",
      buffer
    );

    const extractedText = await extractAttachmentText(
      buffer,
      file.name,
      file.type || "application/octet-stream"
    );

    const attachment = await db.messageAttachment.create({
      data: {
        sessionId,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        filePath: stored.filePath,
        storageKey: stored.storageKey,
        extractedText,
      },
    });

    return NextResponse.json({
      attachment: {
        id: attachment.id,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: attachment.fileSize,
        filePath: attachment.filePath,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
