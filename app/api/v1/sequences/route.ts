import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/v1/sequences?status=pending&page=1 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit  = 50;

  const where = status ? { status } : {};

  const [messages, total] = await Promise.all([
    prisma.scheduledMessage.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.scheduledMessage.count({ where }),
  ]);

  return NextResponse.json({ messages, total, page, limit });
}
