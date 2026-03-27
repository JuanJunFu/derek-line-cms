import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/** GET /api/v1/sequence-defs/:id */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sequence = await prisma.sequence.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  if (!sequence) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: sequence });
}

/** PUT /api/v1/sequence-defs/:id — Update sequence + replace steps */
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, trigger, isActive, steps } = body as {
    name?: string;
    trigger?: string;
    isActive?: boolean;
    steps?: Array<{
      id?: string;
      dayOffset: number;
      messageType: string;
      content: any;
      order: number;
    }>;
  };

  const existing = await prisma.sequence.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update sequence + replace all steps (simpler than diffing)
  await prisma.$transaction(async (tx) => {
    await tx.sequence.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(trigger !== undefined && { trigger }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    if (steps !== undefined) {
      // Delete all existing steps, re-create
      await tx.sequenceStep.deleteMany({ where: { sequenceId: id } });
      await tx.sequenceStep.createMany({
        data: steps.map((s) => ({
          sequenceId: id,
          dayOffset: s.dayOffset,
          messageType: s.messageType,
          content: s.content,
          order: s.order,
        })),
      });
    }
  });

  const updated = await prisma.sequence.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ data: updated });
}

/** DELETE /api/v1/sequence-defs/:id */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.sequence.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.sequence.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
