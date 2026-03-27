import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const region = await prisma.region.findUnique({ where: { id } });
  if (!region) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ region });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const region = await prisma.region.update({
    where: { id },
    data: {
      name: body.name,
      slug: body.slug,
      counties: body.counties,
      order: body.order ?? 0,
      isActive: body.isActive,
    },
  });
  return NextResponse.json({ region });
}
