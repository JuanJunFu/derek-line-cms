import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { lineClient } from "@/lib/line";

// GET /api/v1/rich-menus/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const menu = await prisma.richMenu.findUnique({ where: { id } });
  if (!menu) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ menu });
}

// PUT /api/v1/rich-menus/[id] — update rich menu
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
  const menu = await prisma.richMenu.update({
    where: { id },
    data: {
      name: body.name,
      imageUrl: body.imageUrl,
      areas: body.areas,
      env: body.env,
    },
  });

  return NextResponse.json({ menu });
}

// DELETE /api/v1/rich-menus/[id] — delete from DB (and LINE if deployed)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const menu = await prisma.richMenu.findUnique({ where: { id } });
  if (!menu) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete from LINE if deployed
  if (menu.lineMenuId) {
    try {
      await lineClient.deleteRichMenu(menu.lineMenuId);
    } catch (err) {
      console.error("[rich-menu] Failed to delete from LINE:", err);
    }
  }

  await prisma.richMenu.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
