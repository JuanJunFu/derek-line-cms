import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { lineClient } from "@/lib/line";

// POST /api/v1/rich-menus/[id]/set-default — set as default rich menu
export async function POST(
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

  if (!menu.lineMenuId) {
    return NextResponse.json(
      { error: "Rich menu not deployed to LINE yet" },
      { status: 400 }
    );
  }

  // Set as default on LINE
  await lineClient.setDefaultRichMenu(menu.lineMenuId);

  // Update DB: unset other defaults for same env, then set this one
  await prisma.$transaction([
    prisma.richMenu.updateMany({
      where: { env: menu.env, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.richMenu.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
