import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getCompanyGatheredData } from "@/lib/companies/company-interview-export";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;

  try {
    const data = await getCompanyGatheredData(id);
    if (!data) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Gathered data API error:", error);
    return NextResponse.json({ error: "Failed to load interview data" }, { status: 500 });
  }
}
