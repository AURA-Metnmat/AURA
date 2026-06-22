import { NextResponse } from "next/server";
import { requireCompanyAdmin } from "@/lib/auth/admin-company-guard";
import { getCompanyGatheredData } from "@/lib/companies/company-interview-export";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireCompanyAdmin(request, id);
  if (session instanceof NextResponse) return session;

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
