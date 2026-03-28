/**
 * Deploy paired Rich Menus (新客版 + 熟客版) to LINE with switching aliases
 * This is a standalone script that does everything:
 *   1. Generates menu images using canvas
 *   2. Creates both rich menus on LINE
 *   3. Uploads images
 *   4. Creates switching aliases
 *   5. Sets new-customer menu as default
 *
 * Run: npx tsx scripts/deploy-richmenu-pair.ts
 */
import "dotenv/config";
import { execSync } from "child_process";
import fs from "fs";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
if (!TOKEN) {
  console.error("Missing LINE_CHANNEL_ACCESS_TOKEN in .env");
  process.exit(1);
}

const API = "https://api.line.me/v2/bot";
const DATA_API = "https://api-data.line.me/v2/bot";

const ALIAS_NEW = "richmenu-alias-new";
const ALIAS_VIP = "richmenu-alias-vip";

const W = 2500, H = 1686;
const BANNER_H = 380;
const GRID_H = H - BANNER_H;
const COLS = 3, ROWS = 2;
const CELL_W = Math.floor(W / COLS);
const CELL_H = Math.floor(GRID_H / ROWS);

/**
 * Load pre-generated images from /tmp (created by generate-richmenu-images.ts).
 * If not found, generate them first.
 */
function loadImages(): { newImg: Buffer; vipImg: Buffer } {
  const newPath = "/tmp/richmenu-new-customer.png";
  const vipPath = "/tmp/richmenu-vip-customer.png";

  if (!fs.existsSync(newPath) || !fs.existsSync(vipPath)) {
    console.log("  Images not found, generating...");
    execSync("npx tsx scripts/generate-richmenu-images.ts", { stdio: "inherit" });
  }

  return {
    newImg: fs.readFileSync(newPath),
    vipImg: fs.readFileSync(vipPath),
  };
}

// ── LINE API helpers ──
async function lineApi(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE API ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

async function uploadImage(richMenuId: string, buffer: Buffer) {
  const res = await fetch(`${DATA_API}/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "image/png",
    },
    body: buffer as any,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Image upload: ${res.status} ${text}`);
  }
}

async function deleteAlias(aliasId: string) {
  try {
    await fetch(`${API}/richmenu/alias/${aliasId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    console.log(`  Deleted alias: ${aliasId}`);
  } catch {
    // May not exist
  }
}

async function createAlias(aliasId: string, richMenuId: string) {
  const res = await fetch(`${API}/richmenu/alias`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ richMenuAliasId: aliasId, richMenuId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create alias ${aliasId}: ${res.status} ${text}`);
  }
  console.log(`  Created alias: ${aliasId} → ${richMenuId}`);
}

// ── Main ──
async function main() {
  console.log("🚀 DEREK Rich Menu Pair Deployment\n");

  // Step 1: Clean up old menus
  console.log("Step 1: Cleaning old rich menus...");
  try {
    const list = await lineApi("/richmenu/list");
    for (const rm of list.richmenus || []) {
      await fetch(`${API}/richmenu/${rm.richMenuId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      console.log(`  Deleted menu: ${rm.richMenuId} (${rm.name})`);
    }
  } catch (err) {
    console.log("  (no existing menus to clean)");
  }

  // Clean old aliases
  await deleteAlias(ALIAS_NEW);
  await deleteAlias(ALIAS_VIP);

  // Step 2: Load images (auto-generates if needed)
  console.log("\nStep 2: Loading images...");
  const { newImg, vipImg } = loadImages();
  console.log(`  新客版: ${(newImg.length / 1024).toFixed(0)} KB`);
  console.log(`  熟客版: ${(vipImg.length / 1024).toFixed(0)} KB`);

  // Step 3: Create rich menus on LINE
  console.log("\nStep 3: Creating rich menus on LINE...");

  // Area bounds for 2x3 grid (below banner)
  function makeAreas(actions: Array<{ type: string; [key: string]: any }>) {
    const areas = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const idx = row * COLS + col;
        areas.push({
          bounds: {
            x: CELL_W * col,
            y: BANNER_H + CELL_H * row,
            width: col === COLS - 1 ? W - CELL_W * (COLS - 1) : CELL_W,
            height: row === ROWS - 1 ? H - (BANNER_H + CELL_H) : CELL_H,
          },
          action: actions[idx],
        });
      }
    }
    return areas;
  }

  const newMenu = await lineApi("/richmenu", {
    method: "POST",
    body: JSON.stringify({
      size: { width: W, height: H },
      selected: false,
      name: "DEREK 新客選單",
      chatBarText: "選單",
      areas: makeAreas([
        { type: "message", text: "門市" },
        { type: "message", text: "產品" },
        { type: "uri", uri: "tel:0800063366", label: "免費客服專線" },
        { type: "uri", uri: "https://www.lcb.com.tw", label: "DEREK 官網" },
        { type: "message", text: "推薦" },
        { type: "richmenuswitch", richMenuAliasId: ALIAS_VIP, data: "richmenu-changed-to-vip" },
      ]),
    }),
  });
  console.log(`  新客選單 ID: ${newMenu.richMenuId}`);

  const vipMenu = await lineApi("/richmenu", {
    method: "POST",
    body: JSON.stringify({
      size: { width: W, height: H },
      selected: false,
      name: "DEREK 熟客選單",
      chatBarText: "選單",
      areas: makeAreas([
        { type: "message", text: "維修" },
        { type: "message", text: "推薦" },
        { type: "uri", uri: "tel:0800063366", label: "免費客服專線" },
        { type: "message", text: "門市" },
        { type: "message", text: "產品" },
        { type: "richmenuswitch", richMenuAliasId: ALIAS_NEW, data: "richmenu-changed-to-new" },
      ]),
    }),
  });
  console.log(`  熟客選單 ID: ${vipMenu.richMenuId}`);

  // Step 4: Upload images
  console.log("\nStep 4: Uploading images...");
  await uploadImage(newMenu.richMenuId, newImg);
  console.log("  新客版圖片已上傳");
  await uploadImage(vipMenu.richMenuId, vipImg);
  console.log("  熟客版圖片已上傳");

  // Step 5: Create aliases
  console.log("\nStep 5: Creating switching aliases...");
  await createAlias(ALIAS_NEW, newMenu.richMenuId);
  await createAlias(ALIAS_VIP, vipMenu.richMenuId);

  // Step 6: Set default
  console.log("\nStep 6: Setting new-customer menu as default...");
  await fetch(`${API}/user/all/richmenu/${newMenu.richMenuId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  console.log("  新客版已設為預設選單");

  console.log("\n" + "=".repeat(50));
  console.log("✅ 配對部署完成！");
  console.log("=".repeat(50));
  console.log(`  新客選單: ${newMenu.richMenuId}`);
  console.log(`  熟客選單: ${vipMenu.richMenuId}`);
  console.log(`  新客別名: ${ALIAS_NEW}`);
  console.log(`  熟客別名: ${ALIAS_VIP}`);
  console.log(`  預設選單: 新客版`);
  console.log("\n  用戶可透過右下角「更多服務/基本選單」按鈕切換。");
}

main().catch((err) => {
  console.error("\n❌ 部署失敗:", err.message);
  process.exit(1);
});
