import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/v1/stores — public (used by LINE Bot too)
export async function GET() {
  const stores = await prisma.store.findMany({
    include: { region: true },
    orderBy: [{ region: { order: "asc" } }, { order: "asc" }],
  });
  return NextResponse.json({ stores });
}

// POST /api/v1/stores — protected
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const store = await prisma.store.create({
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
      isActive: body.isActive ?? true,
      order: body.order ?? 0,
    },
    include: { region: true },
  });

  return NextResponse.json({ store }, { status: 201 });
}
