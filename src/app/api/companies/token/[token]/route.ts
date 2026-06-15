import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getInterviewLink } from "@/lib/aura/company-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const company = await db.company.findUnique({
    where: { inviteToken: token, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      industry: true,
      description: true,
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Invalid or expired interview link" }, { status: 404 });
  }

  return NextResponse.json({ company });
}
