import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const replies = await prisma.autoReply.findMany({
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ replies });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const reply = await prisma.autoReply.create({
    data: {
      keyword: body.keyword || null,
      message: body.message,
      isActive: body.isActive ?? true,
      order: body.order ?? 0,
    },
  });
  return NextResponse.json({ reply }, { status: 201 });
}
