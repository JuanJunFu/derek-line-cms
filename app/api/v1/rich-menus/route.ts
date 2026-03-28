import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/v1/rich-menus — list all rich menus
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const menus = await prisma.richMenu.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ menus });
}

// POST /api/v1/rich-menus — create a new rich menu record (DB only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const menu = await prisma.richMenu.create({
    data: {
      name: body.name,
      imageUrl: body.imageUrl || null,
      size: body.size || { width: 2500, height: 1686 },
      areas: body.areas || [],
      env: body.env || "production",
    },
  });

  return NextResponse.json({ menu }, { status: 201 });
}
