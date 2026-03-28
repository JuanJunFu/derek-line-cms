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
import { createCanvas } from "canvas";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
if (!TOKEN) {
  console.error("❌ Missing LINE_CHANNEL_ACCESS_TOKEN in .env");
  process.exit(1);
}

const API = "https://api.line.me/v2/bot";
const DATA_API = "https://api-data.line.me/v2/bot";

const ALIAS_NEW = "richmenu-alias-new";
const ALIAS_VIP = "richmenu-alias-vip";

// ── Image generation ──
const W = 2500, H = 1686;
const BANNER_H = 380;
const GRID_H = H - BANNER_H;
const COLS = 3, ROWS = 2;
const CELL_W = Math.floor(W / COLS);
const CELL_H = Math.floor(GRID_H / ROWS);

const BG_DARK = "#1a1a1a";
const GOLD = "#B89A6A";
const GOLD_LIGHT = "#D4B87A";
const TEXT_DIM = "#666666";
const GRID_LINE = "#2a2a2a";
const ACCENT_GREEN = "#4CAF50";
const ACCENT_BLUE = "#2196F3";

type CellDef = { emoji: string; label: string; sub: string; accent?: string };

function generateImage(cells: CellDef[], subtitle: string): Buffer {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = BG_DARK;
  ctx.fillRect(0, 0, W, H);

  // Banner
  const bannerGrad = ctx.createLinearGradient(0, 0, W, BANNER_H);
  bannerGrad.addColorStop(0, "#222222");
  bannerGrad.addColorStop(0.5, "#111111");
  bannerGrad.addColorStop(1, "#222222");
  ctx.fillStyle = bannerGrad;
  ctx.fillRect(0, 0, W, BANNER_H);

  // Gold line
  const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
  lineGrad.addColorStop(0, "transparent");
  lineGrad.addColorStop(0.2, GOLD);
  lineGrad.addColorStop(0.8, GOLD);
  lineGrad.addColorStop(1, "transparent");
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, BANNER_H - 2);
  ctx.lineTo(W, BANNER_H - 2);
  ctx.stroke();

  // DEREK
  ctx.fillStyle = GOLD;
  ctx.font = "bold 140px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("D  E  R  E  K", W / 2, BANNER_H / 2 - 50);

  ctx.fillStyle = TEXT_DIM;
  ctx.font = "42px sans-serif";
  ctx.fillText("精 品 衛 浴  ·  頂 級 生 活 體 驗", W / 2, BANNER_H / 2 + 30);

  ctx.fillStyle = subtitle.includes("新客") ? ACCENT_GREEN : GOLD_LIGHT;
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(subtitle, W / 2, BANNER_H / 2 + 95);

  // Grid lines
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 2;
  for (let col = 1; col < COLS; col++) {
    ctx.beginPath();
    ctx.moveTo(CELL_W * col, BANNER_H);
    ctx.lineTo(CELL_W * col, H);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, BANNER_H + CELL_H);
  ctx.lineTo(W, BANNER_H + CELL_H);
  ctx.stroke();

  // Cells
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col;
      if (idx >= cells.length) break;
      const cell = cells[idx];
      const cx = CELL_W * col + CELL_W / 2;
      const cy = BANNER_H + CELL_H * row + CELL_H / 2;
      const color = cell.accent || GOLD;

      const cellGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL_W / 2);
      cellGrad.addColorStop(0, "#1f1f1f");
      cellGrad.addColorStop(1, BG_DARK);
      ctx.fillStyle = cellGrad;
      ctx.fillRect(CELL_W * col + 1, BANNER_H + CELL_H * row + 1, CELL_W - 2, CELL_H - 2);

      ctx.font = "100px sans-serif";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cell.emoji, cx, cy - 60);

      ctx.fillStyle = color;
      ctx.font = "bold 64px sans-serif";
      ctx.fillText(cell.label, cx, cy + 40);

      ctx.fillStyle = TEXT_DIM;
      ctx.font = "32px sans-serif";
      ctx.fillText(cell.sub, cx, cy + 100);
    }
  }

  // Bottom bar
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, H - 50, W, 50);
  ctx.fillStyle = BG_DARK;
  ctx.font = "bold 30px sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("DEREK 德瑞克衛浴  |  0800-063-366", W / 2, H - 25);

  return canvas.toBuffer("image/png");
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

  // Step 2: Generate images
  console.log("\nStep 2: Generating images...");
  const newImg = generateImage(
    [
      { emoji: "📍", label: "尋找門市", sub: "查詢附近服務據點" },
      { emoji: "🛁", label: "產品目錄", sub: "瀏覽衛浴產品系列" },
      { emoji: "📞", label: "聯絡我們", sub: "免費客服專線" },
      { emoji: "🌐", label: "品牌官網", sub: "瀏覽最新產品資訊" },
      { emoji: "🤝", label: "推薦好友", sub: "分享推薦碼給朋友" },
      { emoji: "🔄", label: "更多服務", sub: "切換至熟客選單", accent: ACCENT_BLUE },
    ],
    "🌱 新客版  —  歡迎認識 DEREK"
  );
  console.log(`  新客版: ${(newImg.length / 1024).toFixed(0)} KB`);

  const vipImg = generateImage(
    [
      { emoji: "🔧", label: "維修預約", sub: "線上報修快速服務" },
      { emoji: "🤝", label: "推薦好友", sub: "分享推薦碼給朋友" },
      { emoji: "📞", label: "聯絡我們", sub: "免費客服專線" },
      { emoji: "📍", label: "尋找門市", sub: "查詢附近服務據點" },
      { emoji: "🛁", label: "產品目錄", sub: "瀏覽衛浴產品系列" },
      { emoji: "🔄", label: "基本選單", sub: "切換至新客選單", accent: ACCENT_BLUE },
    ],
    "💎 熟客版  —  專屬貴賓服務"
  );
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
