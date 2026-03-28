import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { countAudience } from "@/lib/broadcast";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor") || undefined;

  const broadcasts = await prisma.broadcast.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return NextResponse.json({ broadcasts });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, messageType, content, audienceType, audienceFilter, scheduledAt } = body;

  const audienceCount = await countAudience(audienceType || "all", audienceFilter || null);

  const status = scheduledAt ? "scheduled" : "draft";

  const broadcast = await prisma.broadcast.create({
    data: {
      name,
      messageType: messageType || "text",
      content,
      audienceType: audienceType || "all",
      audienceFilter: audienceFilter || undefined,
      audienceCount,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status,
      createdBy: (session.user as unknown as { dbId?: string })?.dbId || null,
    },
  });

  return NextResponse.json({ broadcast }, { status: 201 });
}
