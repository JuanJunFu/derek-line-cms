import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { lineClient } from "@/lib/line";

// POST /api/v1/rich-menus/[id]/deploy — deploy rich menu to LINE
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

  const size = menu.size as { width: number; height: number };
  const areas = (menu.areas as Array<{
    bounds: { x: number; y: number; width: number; height: number };
    action: { type: string; uri?: string; data?: string; text?: string; label?: string };
  }>) || [];

  // If previously deployed, delete old rich menu from LINE
  if (menu.lineMenuId) {
    try {
      await lineClient.deleteRichMenu(menu.lineMenuId);
    } catch (err) {
      console.error("[rich-menu] Failed to delete old LINE menu:", err);
    }
  }

  // Create rich menu on LINE
  const result = await lineClient.createRichMenu({
    size: { width: size.width, height: size.height },
    selected: false,
    name: menu.name,
    chatBarText: "選單",
    areas: areas.map((area) => ({
      bounds: area.bounds,
      action: area.action,
    })),
  });

  const lineMenuId = result.richMenuId;

  // Upload image to LINE if imageUrl exists
  if (menu.imageUrl) {
    try {
      const imgRes = await fetch(menu.imageUrl);
      if (!imgRes.ok) {
        throw new Error(`Failed to download image: ${imgRes.status}`);
      }
      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Use LINE Data API directly for image upload (same pattern as setup script)
      const token = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
      const uploadRes = await fetch(
        `https://api-data.line.me/v2/bot/richmenu/${lineMenuId}/content`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "image/png",
          },
          body: buffer,
        }
      );
      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        console.error("[rich-menu] Image upload failed:", text);
      }
    } catch (err) {
      console.error("[rich-menu] Image upload error:", err);
    }
  }

  // Save lineMenuId back to DB
  await prisma.richMenu.update({
    where: { id },
    data: { lineMenuId },
  });

  return NextResponse.json({ ok: true, lineMenuId });
}
