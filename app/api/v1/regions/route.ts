import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const regions = await prisma.region.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { stores: true } } },
  });
  return NextResponse.json({ regions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const region = await prisma.region.create({
    data: {
      name: body.name,
      slug: body.slug,
      counties: body.counties ?? [],
      order: body.order ?? 0,
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json({ region }, { status: 201 });
}
