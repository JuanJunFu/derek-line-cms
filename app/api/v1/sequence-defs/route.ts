import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/v1/sequence-defs — List all sequence definitions */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sequences = await prisma.sequence.findMany({
    include: { steps: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: sequences });
}

/** POST /api/v1/sequence-defs — Create a new sequence */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, trigger, isActive, steps } = body as {
    name: string;
    trigger: string;
    isActive?: boolean;
    steps?: Array<{
      dayOffset: number;
      messageType: string;
      content: any;
      order: number;
    }>;
  };

  if (!name || !trigger) {
    return NextResponse.json({ error: "name and trigger are required" }, { status: 400 });
  }

  const sequence = await prisma.sequence.create({
    data: {
      name,
      trigger,
      isActive: isActive ?? true,
      steps: steps
        ? {
            create: steps.map((s) => ({
              dayOffset: s.dayOffset,
              messageType: s.messageType,
              content: s.content,
              order: s.order,
            })),
          }
        : undefined,
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ data: sequence }, { status: 201 });
}
