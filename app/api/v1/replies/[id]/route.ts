import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const reply = await prisma.autoReply.update({
    where: { id },
    data: {
      keyword: body.keyword || null,
      message: body.message,
      isActive: body.isActive,
      order: body.order ?? 0,
    },
  });
  return NextResponse.json({ reply });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.autoReply.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
