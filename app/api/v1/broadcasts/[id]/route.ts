import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { countAudience } from "@/lib/broadcast";

export async function GET(
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

  return NextResponse.json({ broadcast });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.broadcast.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status !== "draft" && existing.status !== "scheduled") {
    return NextResponse.json(
      { error: "Cannot update broadcast with status: " + existing.status },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { name, messageType, content, audienceType, audienceFilter, scheduledAt } = body;

  // Recalculate audience count if audience params changed
  const newAudienceType = audienceType ?? existing.audienceType;
  const newAudienceFilter = audienceFilter !== undefined ? audienceFilter : existing.audienceFilter;
  const audienceCount = await countAudience(
    newAudienceType,
    newAudienceFilter as { tags?: string[]; exclude?: string[] } | null
  );

  const broadcast = await prisma.broadcast.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(messageType !== undefined && { messageType }),
      ...(content !== undefined && { content }),
      ...(audienceType !== undefined && { audienceType }),
      ...(audienceFilter !== undefined && { audienceFilter }),
      ...(scheduledAt !== undefined && {
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? "scheduled" : "draft",
      }),
      audienceCount,
    },
  });

  return NextResponse.json({ broadcast });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.broadcast.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status !== "draft" && existing.status !== "scheduled") {
    return NextResponse.json(
      { error: "Cannot delete broadcast with status: " + existing.status },
      { status: 400 }
    );
  }

  await prisma.broadcast.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
