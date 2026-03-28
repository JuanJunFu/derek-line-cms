import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendBroadcast } from "@/lib/broadcast";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const broadcast = await prisma.broadcast.findUnique({ where: { id } });

  if (!broadcast) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (broadcast.status !== "draft" && broadcast.status !== "scheduled") {
    return NextResponse.json(
      { error: "Cannot send broadcast with status: " + broadcast.status },
      { status: 400 }
    );
  }

  try {
    const { sentCount, failCount } = await sendBroadcast(id);
    return NextResponse.json({ ok: true, sentCount, failCount });
  } catch {
    return NextResponse.json(
      { error: "Broadcast sending failed" },
      { status: 500 }
    );
  }
}
