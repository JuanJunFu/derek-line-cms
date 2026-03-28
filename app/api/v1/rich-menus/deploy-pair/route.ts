import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { lineClient } from "@/lib/line";

const ALIAS_NEW = "richmenu-alias-new";
const ALIAS_VIP = "richmenu-alias-vip";

/**
 * POST /api/v1/rich-menus/deploy-pair
 *
 * Deploys two rich menus (新客版 + 熟客版) to LINE with switching aliases.
 * Steps:
 * 1. Find the two menus in DB (by name containing 新客 and 熟客)
 * 2. Create both rich menus on LINE
 * 3. Upload images for both
 * 4. Create/update LINE rich menu aliases for switching
 * 5. Set new-customer menu as default
 * 6. Pair them in DB
 */
export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the two menus
  const allMenus = await prisma.richMenu.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const newCustomerMenu = allMenus.find((m) => m.name.includes("新客"));
  const vipCustomerMenu = allMenus.find((m) => m.name.includes("熟客"));

  if (!newCustomerMenu || !vipCustomerMenu) {
    return NextResponse.json(
      { error: "找不到新客版或熟客版選單，請先建立兩個選單" },
      { status: 400 }
    );
  }

  if (!newCustomerMenu.imageUrl || !vipCustomerMenu.imageUrl) {
    return NextResponse.json(
      { error: "兩個選單都需要上傳圖片才能部署" },
      { status: 400 }
    );
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN!;

  try {
    // ── Step 1: Delete old menus on LINE if previously deployed ──
    for (const menu of [newCustomerMenu, vipCustomerMenu]) {
      if (menu.lineMenuId) {
        try {
          await lineClient.deleteRichMenu(menu.lineMenuId);
        } catch (err) {
          console.error(`[deploy-pair] Failed to delete old menu ${menu.lineMenuId}:`, err);
        }
      }
    }

    // ── Step 2: Delete old aliases (ignore if not found) ──
    for (const aliasId of [ALIAS_NEW, ALIAS_VIP]) {
      try {
        await fetch(`https://api.line.me/v2/bot/richmenu/alias/${aliasId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Alias may not exist yet, that's fine
      }
    }

    // ── Step 3: Create both rich menus on LINE ──
    const newSize = newCustomerMenu.size as { width: number; height: number };
    const newAreas = (newCustomerMenu.areas as Array<{
      bounds: { x: number; y: number; width: number; height: number };
      action: Record<string, unknown>;
    }>) || [];

    const newResult = await lineClient.createRichMenu({
      size: { width: newSize.width, height: newSize.height },
      selected: false,
      name: newCustomerMenu.name,
      chatBarText: "選單",
      areas: newAreas.map((area) => ({
        bounds: area.bounds,
        action: area.action as any,
      })),
    });
    const newLineMenuId = newResult.richMenuId;

    const vipSize = vipCustomerMenu.size as { width: number; height: number };
    const vipAreas = (vipCustomerMenu.areas as Array<{
      bounds: { x: number; y: number; width: number; height: number };
      action: Record<string, unknown>;
    }>) || [];

    const vipResult = await lineClient.createRichMenu({
      size: { width: vipSize.width, height: vipSize.height },
      selected: false,
      name: vipCustomerMenu.name,
      chatBarText: "選單",
      areas: vipAreas.map((area) => ({
        bounds: area.bounds,
        action: area.action as any,
      })),
    });
    const vipLineMenuId = vipResult.richMenuId;

    // ── Step 4: Upload images ──
    for (const [menuId, imageUrl] of [
      [newLineMenuId, newCustomerMenu.imageUrl!],
      [vipLineMenuId, vipCustomerMenu.imageUrl!],
    ] as [string, string][]) {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        throw new Error(`Failed to download image: ${imgRes.status}`);
      }
      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadRes = await fetch(
        `https://api-data.line.me/v2/bot/richmenu/${menuId}/content`,
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
        console.error(`[deploy-pair] Image upload failed for ${menuId}:`, text);
      }
    }

    // ── Step 5: Create aliases for menu switching ──
    // Alias for new customer menu
    const aliasNewRes = await fetch("https://api.line.me/v2/bot/richmenu/alias", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        richMenuAliasId: ALIAS_NEW,
        richMenuId: newLineMenuId,
      }),
    });
    if (!aliasNewRes.ok) {
      const errText = await aliasNewRes.text();
      console.error("[deploy-pair] Failed to create alias for new:", errText);
    }

    // Alias for VIP customer menu
    const aliasVipRes = await fetch("https://api.line.me/v2/bot/richmenu/alias", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        richMenuAliasId: ALIAS_VIP,
        richMenuId: vipLineMenuId,
      }),
    });
    if (!aliasVipRes.ok) {
      const errText = await aliasVipRes.text();
      console.error("[deploy-pair] Failed to create alias for vip:", errText);
    }

    // ── Step 6: Set new customer menu as default ──
    await lineClient.setDefaultRichMenu(newLineMenuId);

    // ── Step 7: Update DB ──
    await prisma.$transaction([
      // Clear all existing defaults for same env
      prisma.richMenu.updateMany({
        where: { env: newCustomerMenu.env, isDefault: true },
        data: { isDefault: false },
      }),
      // Update new customer menu
      prisma.richMenu.update({
        where: { id: newCustomerMenu.id },
        data: {
          lineMenuId: newLineMenuId,
          aliasId: ALIAS_NEW,
          isDefault: true,
          pairedWith: vipCustomerMenu.id,
        },
      }),
      // Update VIP customer menu
      prisma.richMenu.update({
        where: { id: vipCustomerMenu.id },
        data: {
          lineMenuId: vipLineMenuId,
          aliasId: ALIAS_VIP,
          isDefault: false,
          pairedWith: newCustomerMenu.id,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      newCustomerMenuId: newLineMenuId,
      vipCustomerMenuId: vipLineMenuId,
      aliases: { new: ALIAS_NEW, vip: ALIAS_VIP },
    });
  } catch (err) {
    console.error("[deploy-pair] Error:", err);
    return NextResponse.json(
      { error: `配對部署失敗: ${err instanceof Error ? err.message : "未知錯誤"}` },
      { status: 500 }
    );
  }
}
