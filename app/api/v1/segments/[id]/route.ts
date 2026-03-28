import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateSegmentUsers } from "@/lib/segment";

// GET /api/v1/segments/[id] — get segment with recalculated userCount
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const segment = await prisma.segment.findUnique({ where: { id } });
  if (!segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }

  // Recalculate user count
  const result = await calculateSegmentUsers(
    segment.conditions as Record<string, string[]>
  );

  // Update cached count
  if (result.count !== segment.userCount) {
    await prisma.segment.update({
      where: { id },
      data: { userCount: result.count },
    });
  }

  return NextResponse.json({
    segment: { ...segment, userCount: result.count },
  });
}

// PUT /api/v1/segments/[id] — update segment
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, conditions } = body;

  const existing = await prisma.segment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }

  const finalConditions = conditions ?? existing.conditions;
  const result = await calculateSegmentUsers(
    finalConditions as Record<string, string[]>
  );

  const segment = await prisma.segment.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      description: description !== undefined ? description : existing.description,
      conditions: finalConditions,
      userCount: result.count,
    },
  });

  return NextResponse.json({ segment });
}

// DELETE /api/v1/segments/[id] — delete segment
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.segment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }

  await prisma.segment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
