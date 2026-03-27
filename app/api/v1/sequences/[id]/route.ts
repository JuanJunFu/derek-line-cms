import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** PATCH /api/v1/sequences/:id — cancel or reschedule */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as { action: "cancel" | "reschedule"; scheduledAt?: string };

  const msg = await prisma.scheduledMessage.findUnique({ where: { id } });
  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (msg.status === "sent") {
    return NextResponse.json({ error: "已發送的訊息無法修改" }, { status: 400 });
  }
  if (msg.status === "processing") {
    return NextResponse.json({ error: "處理中的訊息無法修改，請稍後再試" }, { status: 409 });
  }

  if (body.action === "cancel") {
    const updated = await prisma.scheduledMessage.update({
      where: { id },
      data: { status: "cancelled" },
    });
    return NextResponse.json({ ok: true, message: updated });
  }

  if (body.action === "reschedule") {
    if (!body.scheduledAt) {
      return NextResponse.json({ error: "scheduledAt is required" }, { status: 400 });
    }
    const newDate = new Date(body.scheduledAt);
    if (isNaN(newDate.getTime())) {
      return NextResponse.json({ error: "Invalid scheduledAt date" }, { status: 400 });
    }
    const updated = await prisma.scheduledMessage.update({
      where: { id },
      data: { scheduledAt: newDate, status: "pending" },
    });
    return NextResponse.json({ ok: true, message: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
