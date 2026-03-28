/**
 * Generate Rich Menu images for DEREK LINE Bot — 新客版 + 熟客版
 * 2x3 grid layout (6 areas) with DEREK brand banner
 * Run: npx tsx scripts/generate-richmenu-images.ts
 *
 * Output:
 *   /tmp/richmenu-new-customer.png  (新客版)
 *   /tmp/richmenu-vip-customer.png  (熟客版)
 */
import { createCanvas } from "canvas";
import fs from "fs";

const W = 2500;
const H = 1686;
const BANNER_H = 380; // top banner area
const GRID_H = H - BANNER_H; // bottom grid
const COLS = 3;
const ROWS = 2;
const CELL_W = Math.floor(W / COLS);
const CELL_H = Math.floor(GRID_H / ROWS);

// Brand colors
const BG_DARK = "#1a1a1a";
const BG_BANNER = "#111111";
const GOLD = "#B89A6A";
const GOLD_LIGHT = "#D4B87A";
const TEXT_DIM = "#666666";
const GRID_LINE = "#2a2a2a";
const ACCENT_GREEN = "#4CAF50";
const ACCENT_BLUE = "#2196F3";

type CellDef = {
  emoji: string;
  label: string;
  sub: string;
  accent?: string; // override color for special cells
};

function drawMenu(cells: CellDef[], title: string, subtitle: string, filename: string) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── Background ──
  ctx.fillStyle = BG_DARK;
  ctx.fillRect(0, 0, W, H);

  // ── Banner (top) ──
  const bannerGrad = ctx.createLinearGradient(0, 0, W, BANNER_H);
  bannerGrad.addColorStop(0, "#222222");
  bannerGrad.addColorStop(0.5, BG_BANNER);
  bannerGrad.addColorStop(1, "#222222");
  ctx.fillStyle = bannerGrad;
  ctx.fillRect(0, 0, W, BANNER_H);

  // Gold accent line under banner
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

  // DEREK brand text
  ctx.fillStyle = GOLD;
  ctx.font = "bold 140px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("D  E  R  E  K", W / 2, BANNER_H / 2 - 50);

  // Subtitle under brand
  ctx.fillStyle = TEXT_DIM;
  ctx.font = "42px sans-serif";
  ctx.fillText("精 品 衛 浴  ·  頂 級 生 活 體 驗", W / 2, BANNER_H / 2 + 30);

  // Menu type badge
  ctx.fillStyle = title.includes("新客") ? ACCENT_GREEN : GOLD_LIGHT;
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(subtitle, W / 2, BANNER_H / 2 + 95);

  // ── Grid lines ──
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 2;

  // Vertical lines
  for (let col = 1; col < COLS; col++) {
    const x = CELL_W * col;
    ctx.beginPath();
    ctx.moveTo(x, BANNER_H);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  // Horizontal middle line
  ctx.beginPath();
  ctx.moveTo(0, BANNER_H + CELL_H);
  ctx.lineTo(W, BANNER_H + CELL_H);
  ctx.stroke();

  // ── Cells ──
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col;
      if (idx >= cells.length) break;

      const cell = cells[idx];
      const cx = CELL_W * col + CELL_W / 2;
      const cy = BANNER_H + CELL_H * row + CELL_H / 2;
      const cellColor = cell.accent || GOLD;

      // Subtle cell background hover effect (slightly lighter center)
      const cellGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL_W / 2);
      cellGrad.addColorStop(0, "#1f1f1f");
      cellGrad.addColorStop(1, BG_DARK);
      ctx.fillStyle = cellGrad;
      ctx.fillRect(CELL_W * col + 1, BANNER_H + CELL_H * row + 1, CELL_W - 2, CELL_H - 2);

      // Emoji (large)
      ctx.font = "100px sans-serif";
      ctx.fillStyle = cellColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cell.emoji, cx, cy - 60);

      // Label
      ctx.fillStyle = cellColor;
      ctx.font = "bold 64px sans-serif";
      ctx.fillText(cell.label, cx, cy + 40);

      // Sub label
      ctx.fillStyle = TEXT_DIM;
      ctx.font = "32px sans-serif";
      ctx.fillText(cell.sub, cx, cy + 100);
    }
  }

  // ── Bottom brand bar ──
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, H - 50, W, 50);
  ctx.fillStyle = BG_DARK;
  ctx.font = "bold 30px sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("DEREK 德瑞克衛浴  |  0800-063-366", W / 2, H - 25);

  // Save
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(filename, buffer);
  console.log(`✅ ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

// ── 新客版 (New Customer) ──
const newCustomerCells: CellDef[] = [
  { emoji: "📍", label: "尋找門市", sub: "查詢附近服務據點" },
  { emoji: "🛁", label: "產品目錄", sub: "瀏覽衛浴產品系列" },
  { emoji: "📞", label: "聯絡我們", sub: "免費客服專線" },
  { emoji: "🌐", label: "品牌官網", sub: "瀏覽最新產品資訊" },
  { emoji: "🤝", label: "推薦好友", sub: "分享推薦碼給朋友" },
  { emoji: "🔄", label: "更多服務", sub: "切換至熟客選單", accent: ACCENT_BLUE },
];

// ── 熟客版 (VIP Customer) ──
const vipCustomerCells: CellDef[] = [
  { emoji: "🔧", label: "維修預約", sub: "線上報修快速服務" },
  { emoji: "🤝", label: "推薦好友", sub: "分享推薦碼給朋友" },
  { emoji: "📞", label: "聯絡我們", sub: "免費客服專線" },
  { emoji: "📍", label: "尋找門市", sub: "查詢附近服務據點" },
  { emoji: "🛁", label: "產品目錄", sub: "瀏覽衛浴產品系列" },
  { emoji: "🔄", label: "基本選單", sub: "切換至新客選單", accent: ACCENT_BLUE },
];

console.log("🎨 Generating DEREK Rich Menu images...\n");

drawMenu(
  newCustomerCells,
  "DEREK 新客選單",
  "🌱 新客版  —  歡迎認識 DEREK",
  "/tmp/richmenu-new-customer.png"
);

drawMenu(
  vipCustomerCells,
  "DEREK 熟客選單",
  "💎 熟客版  —  專屬貴賓服務",
  "/tmp/richmenu-vip-customer.png"
);

console.log("\n📋 Next steps:");
console.log("   1. Upload images to CMS (圖文選單管理)");
console.log("   2. Or run: npx tsx scripts/deploy-richmenu-pair.ts");
