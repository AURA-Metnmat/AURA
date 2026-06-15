import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
  runReferenceImport,
  runReferenceImportFromUploads,
} from "@/lib/import/reference-import";

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const companySlug = (formData.get("companySlug") as string | null)?.trim();
      if (!companySlug) {
        return NextResponse.json({ error: "companySlug required" }, { status: 400 });
      }

      const uploads: { fileName: string; buffer: Buffer }[] = [];
      for (const entry of formData.getAll("files")) {
        if (entry instanceof File && entry.size > 0) {
          const buffer = Buffer.from(await entry.arrayBuffer());
          uploads.push({ fileName: entry.name, buffer });
        }
      }

      const stats = await runReferenceImportFromUploads(companySlug, uploads);
      return NextResponse.json({
        success: true,
        message: `Imported ${uploads.length} file(s) for ${companySlug}`,
        stats,
      });
    }

    const body = await request.json().catch(() => ({}));
    const companySlug = (body as { companySlug?: string }).companySlug?.trim();
    if (!companySlug) {
      return NextResponse.json({ error: "companySlug required" }, { status: 400 });
    }

    const stats = await runReferenceImport(companySlug);
    return NextResponse.json({
      success: true,
      message: `Reference data imported from server folder for ${companySlug}`,
      stats,
    });
  } catch (error) {
    const err = error as Error;
    console.error("Import error:", err.message);
    return NextResponse.json({ error: "Import failed", details: err.message }, { status: 500 });
  }
}
