import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/v1/stores/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = await prisma.store.findUnique({
    where: { id },
    include: { region: true },
  });
  if (!store) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ store });
}

// PUT /api/v1/stores/[id] — update
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const store = await prisma.store.update({
    where: { id },
    data: {
      name: body.name,
      type: body.type,
      regionId: body.regionId,
      address: body.address,
      phone: body.phone,
      lineId: body.lineId || null,
      hours: body.hours,
      imageUrl: body.imageUrl || null,
      googleMapUrl: body.googleMapUrl || null,
      description: body.description || null,
      isActive: body.isActive,
      order: body.order ?? 0,
    },
    include: { region: true },
  });

  return NextResponse.json({ store });
}

// PATCH /api/v1/stores/[id] — toggle active
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const store = await prisma.store.update({
    where: { id },
    data: { isActive: body.isActive },
    include: { region: true },
  });

  return NextResponse.json({ store });
}
