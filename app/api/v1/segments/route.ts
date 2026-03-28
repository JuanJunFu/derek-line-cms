import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateSegmentUsers } from "@/lib/segment";

// GET /api/v1/segments — list all segments
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const segments = await prisma.segment.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ segments });
}

// POST /api/v1/segments — create segment
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, conditions, preview } = body;

  if (!name || !conditions) {
    return NextResponse.json(
      { error: "name and conditions are required" },
      { status: 400 }
    );
  }

  // Calculate audience count
  const result = await calculateSegmentUsers(conditions);

  // If preview mode, just return the count without creating
  if (preview) {
    return NextResponse.json({ userCount: result.count, userIds: result.userIds });
  }

  const segment = await prisma.segment.create({
    data: {
      name,
      description: description || null,
      conditions,
      userCount: result.count,
    },
  });

  return NextResponse.json({ segment }, { status: 201 });
}
