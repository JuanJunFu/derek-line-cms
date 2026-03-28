/**
 * Generate Rich Menu images for DEREK LINE Bot — 新客版 + 熟客版
 * 2x3 grid layout (6 areas) with DEREK brand banner
 * Uses Canvas path drawing for colorful icons (node-canvas doesn't render emoji)
 *
 * Run: npx tsx scripts/generate-richmenu-images.ts
 *
 * Output:
 *   /tmp/richmenu-new-customer.png  (新客版)
 *   /tmp/richmenu-vip-customer.png  (熟客版)
 */
import { createCanvas, type CanvasRenderingContext2D } from "canvas";
import fs from "fs";

const W = 2500;
const H = 1686;
const BANNER_H = 380;
const GRID_H = H - BANNER_H;
const COLS = 3;
const ROWS = 2;
const CELL_W = Math.floor(W / COLS);
const CELL_H = Math.floor(GRID_H / ROWS);

// Brand colors
const BG_DARK = "#1a1a1a";
const BG_BANNER = "#111111";
const GOLD = "#B89A6A";
const GOLD_LIGHT = "#D4B87A";
const TEXT_WHITE = "#EEEEEE";
const TEXT_DIM = "#888888";
const GRID_LINE = "#2a2a2a";

// Icon colors — vibrant on dark
const ICON_COLORS: Record<string, { bg: string; fg: string }> = {
  store:   { bg: "#E74C3C", fg: "#FFFFFF" }, // red
  product: { bg: "#3498DB", fg: "#FFFFFF" }, // blue
  phone:   { bg: "#2ECC71", fg: "#FFFFFF" }, // green
  web:     { bg: "#9B59B6", fg: "#FFFFFF" }, // purple
  refer:   { bg: "#F39C12", fg: "#FFFFFF" }, // orange
  switch:  { bg: "#1ABC9C", fg: "#FFFFFF" }, // teal
  repair:  { bg: "#E67E22", fg: "#FFFFFF" }, // dark orange
};

// ── Icon drawing functions ──
// Each draws inside a circle at (cx, cy) with radius r

function drawMapPin(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, colors: { bg: string; fg: string }) {
  // Circle background
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = colors.bg;
  ctx.fill();

  // Pin shape
  const s = r * 0.5;
  ctx.fillStyle = colors.fg;
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.3, s * 0.55, 0, Math.PI * 2);
  ctx.fill();
  // Pin point
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, cy);
  ctx.lineTo(cx, cy + s * 0.9);
  ctx.lineTo(cx + s * 0.35, cy);
  ctx.fill();
  // Inner dot
  ctx.fillStyle = colors.bg;
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.3, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawBathtub(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, colors: { bg: string; fg: string }) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = colors.bg;
  ctx.fill();

  const s = r * 0.5;
  ctx.strokeStyle = colors.fg;
  ctx.lineWidth = s * 0.2;
  ctx.lineCap = "round";

  // Tub body (U shape)
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.8, cy - s * 0.1);
  ctx.lineTo(cx - s * 0.8, cy + s * 0.3);
  ctx.quadraticCurveTo(cx - s * 0.8, cy + s * 0.7, cx - s * 0.3, cy + s * 0.7);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.7);
  ctx.quadraticCurveTo(cx + s * 0.8, cy + s * 0.7, cx + s * 0.8, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.8, cy - s * 0.1);
  ctx.stroke();

  // Rim line
  ctx.beginPath();
  ctx.moveTo(cx - s, cy - s * 0.1);
  ctx.lineTo(cx + s, cy - s * 0.1);
  ctx.stroke();

  // Faucet
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy - s * 0.1);
  ctx.lineTo(cx - s * 0.3, cy - s * 0.55);
  ctx.lineTo(cx + s * 0.05, cy - s * 0.55);
  ctx.stroke();

  // Water drop
  ctx.fillStyle = colors.fg;
  ctx.beginPath();
  ctx.arc(cx + s * 0.05, cy - s * 0.35, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawPhone(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, colors: { bg: string; fg: string }) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = colors.bg;
  ctx.fill();

  const s = r * 0.45;
  ctx.strokeStyle = colors.fg;
  ctx.lineWidth = s * 0.25;
  ctx.lineCap = "round";

  // Phone receiver shape
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.7, cy - s * 0.5);
  ctx.quadraticCurveTo(cx - s * 0.9, cy - s * 0.1, cx - s * 0.5, cy + s * 0.1);
  ctx.quadraticCurveTo(cx, cy + s * 0.4, cx + s * 0.5, cy + s * 0.1);
  ctx.quadraticCurveTo(cx + s * 0.9, cy - s * 0.1, cx + s * 0.7, cy + s * 0.5);
  ctx.stroke();
}

function drawGlobe(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, colors: { bg: string; fg: string }) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = colors.bg;
  ctx.fill();

  const s = r * 0.55;
  ctx.strokeStyle = colors.fg;
  ctx.lineWidth = s * 0.12;

  // Outer circle
  ctx.beginPath();
  ctx.arc(cx, cy, s, 0, Math.PI * 2);
  ctx.stroke();

  // Vertical ellipse
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.45, s, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.lineTo(cx + s, cy);
  ctx.stroke();

  // Top curve
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.85, cy - s * 0.4);
  ctx.quadraticCurveTo(cx, cy - s * 0.55, cx + s * 0.85, cy - s * 0.4);
  ctx.stroke();

  // Bottom curve
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.85, cy + s * 0.4);
  ctx.quadraticCurveTo(cx, cy + s * 0.55, cx + s * 0.85, cy + s * 0.4);
  ctx.stroke();
}

function drawHandshake(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, colors: { bg: string; fg: string }) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = colors.bg;
  ctx.fill();

  const s = r * 0.45;
  ctx.strokeStyle = colors.fg;
  ctx.lineWidth = s * 0.22;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Two hands meeting
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.9, cy + s * 0.2);
  ctx.lineTo(cx - s * 0.3, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.1, cy + s * 0.15);
  ctx.lineTo(cx + s * 0.5, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.9, cy + s * 0.2);
  ctx.stroke();

  // Heart above
  ctx.fillStyle = colors.fg;
  const hx = cx, hy = cy - s * 0.55, hs = s * 0.2;
  ctx.beginPath();
  ctx.moveTo(hx, hy + hs * 0.5);
  ctx.bezierCurveTo(hx - hs, hy - hs * 0.3, hx - hs * 0.6, hy - hs, hx, hy - hs * 0.3);
  ctx.bezierCurveTo(hx + hs * 0.6, hy - hs, hx + hs, hy - hs * 0.3, hx, hy + hs * 0.5);
  ctx.fill();
}

function drawSwitch(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, colors: { bg: string; fg: string }) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = colors.bg;
  ctx.fill();

  const s = r * 0.4;
  ctx.strokeStyle = colors.fg;
  ctx.lineWidth = s * 0.2;
  ctx.lineCap = "round";

  // Circular arrows
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.7, -Math.PI * 0.8, Math.PI * 0.3);
  ctx.stroke();

  // Arrow head 1
  const a1x = cx + s * 0.7 * Math.cos(Math.PI * 0.3);
  const a1y = cy + s * 0.7 * Math.sin(Math.PI * 0.3);
  ctx.fillStyle = colors.fg;
  ctx.beginPath();
  ctx.moveTo(a1x + s * 0.3, a1y - s * 0.1);
  ctx.lineTo(a1x - s * 0.05, a1y - s * 0.15);
  ctx.lineTo(a1x + s * 0.05, a1y + s * 0.25);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.7, Math.PI * 0.2, -Math.PI * 0.8 + Math.PI * 2);
  ctx.stroke();

  // Arrow head 2
  const a2x = cx + s * 0.7 * Math.cos(-Math.PI * 0.8);
  const a2y = cy + s * 0.7 * Math.sin(-Math.PI * 0.8);
  ctx.beginPath();
  ctx.moveTo(a2x - s * 0.3, a2y + s * 0.1);
  ctx.lineTo(a2x + s * 0.05, a2y + s * 0.15);
  ctx.lineTo(a2x - s * 0.05, a2y - s * 0.25);
  ctx.fill();
}

function drawWrench(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, colors: { bg: string; fg: string }) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = colors.bg;
  ctx.fill();

  const s = r * 0.45;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 4);

  ctx.fillStyle = colors.fg;

  // Wrench head (open end)
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.9);
  ctx.lineTo(-s * 0.5, -s * 0.6);
  ctx.lineTo(-s * 0.35, -s * 0.45);
  ctx.lineTo(-s * 0.2, -s * 0.5);
  ctx.lineTo(s * 0.2, -s * 0.5);
  ctx.lineTo(s * 0.35, -s * 0.45);
  ctx.lineTo(s * 0.5, -s * 0.6);
  ctx.lineTo(s * 0.2, -s * 0.9);
  ctx.closePath();
  ctx.fill();

  // Handle
  ctx.fillRect(-s * 0.15, -s * 0.5, s * 0.3, s * 1.3);

  // Bottom rounded
  ctx.beginPath();
  ctx.arc(0, s * 0.8, s * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

type IconFn = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, colors: { bg: string; fg: string }) => void;

type CellDef = {
  icon: string; // key into ICON_COLORS
  drawIcon: IconFn;
  label: string;
  sub: string;
};

function drawMenu(cells: CellDef[], title: string, subtitle: string, isNew: boolean, filename: string) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── Background ──
  ctx.fillStyle = BG_DARK;
  ctx.fillRect(0, 0, W, H);

  // ── Banner (top) with gradient ──
  const bannerGrad = ctx.createLinearGradient(0, 0, W, BANNER_H);
  bannerGrad.addColorStop(0, "#1c1c1c");
  bannerGrad.addColorStop(0.5, BG_BANNER);
  bannerGrad.addColorStop(1, "#1c1c1c");
  ctx.fillStyle = bannerGrad;
  ctx.fillRect(0, 0, W, BANNER_H);

  // Gold accent line under banner
  const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
  lineGrad.addColorStop(0, "rgba(184,154,106,0)");
  lineGrad.addColorStop(0.15, GOLD);
  lineGrad.addColorStop(0.85, GOLD);
  lineGrad.addColorStop(1, "rgba(184,154,106,0)");
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
  ctx.fillText("D  E  R  E  K", W / 2, BANNER_H / 2 - 55);

  // Tagline
  ctx.fillStyle = TEXT_DIM;
  ctx.font = "42px sans-serif";
  ctx.fillText(subtitle, W / 2, BANNER_H / 2 + 25);

  // Menu type badge
  const badgeText = isNew ? "Welcome Menu" : "VIP Menu";
  const badgeColor = isNew ? "#2ECC71" : GOLD_LIGHT;
  ctx.fillStyle = badgeColor;
  ctx.font = "bold 34px sans-serif";
  ctx.fillText(badgeText, W / 2, BANNER_H / 2 + 90);

  // ── Grid lines (subtle) ──
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 2;
  for (let col = 1; col < COLS; col++) {
    ctx.beginPath();
    ctx.moveTo(CELL_W * col, BANNER_H);
    ctx.lineTo(CELL_W * col, H - 50);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, BANNER_H + CELL_H);
  ctx.lineTo(W, BANNER_H + CELL_H);
  ctx.stroke();

  // ── Cells ──
  const ICON_R = 65; // icon circle radius

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col;
      if (idx >= cells.length) break;

      const cell = cells[idx];
      const cx = CELL_W * col + CELL_W / 2;
      const cy = BANNER_H + CELL_H * row + CELL_H / 2;
      const colors = ICON_COLORS[cell.icon];

      // Subtle cell glow behind icon
      const glow = ctx.createRadialGradient(cx, cy - 30, 0, cx, cy - 30, ICON_R * 2.5);
      glow.addColorStop(0, colors.bg + "18"); // very faint
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(CELL_W * col, BANNER_H + CELL_H * row, CELL_W, CELL_H);

      // Draw icon
      cell.drawIcon(ctx, cx, cy - 55, ICON_R, colors);

      // Label
      ctx.fillStyle = TEXT_WHITE;
      ctx.font = "bold 56px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cell.label, cx, cy + 50);

      // Sub label
      ctx.fillStyle = TEXT_DIM;
      ctx.font = "34px sans-serif";
      ctx.fillText(cell.sub, cx, cy + 105);
    }
  }

  // ── Bottom brand bar ──
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, H - 50, W, 50);
  ctx.fillStyle = BG_DARK;
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DEREK  |  0800-063-366  |  www.lcb.com.tw", W / 2, H - 25);

  // Save
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(filename, buffer);
  console.log(`Generated ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

// ── New Customer Menu ──
const newCustomerCells: CellDef[] = [
  { icon: "store",   drawIcon: drawMapPin,    label: "尋找門市", sub: "查詢附近服務據點" },
  { icon: "product", drawIcon: drawBathtub,   label: "最新活動", sub: "瀏覽衛浴產品系列" },
  { icon: "phone",   drawIcon: drawPhone,     label: "聯絡我們", sub: "免費客服專線" },
  { icon: "web",     drawIcon: drawGlobe,     label: "品牌官網", sub: "瀏覽最新產品資訊" },
  { icon: "refer",   drawIcon: drawHandshake, label: "推薦好友", sub: "分享推薦碼給朋友" },
  { icon: "switch",  drawIcon: drawSwitch,    label: "更多服務", sub: "切換至熟客選單" },
];

// ── VIP Customer Menu ──
const vipCustomerCells: CellDef[] = [
  { icon: "repair",  drawIcon: drawWrench,    label: "維修預約", sub: "線上報修快速服務" },
  { icon: "refer",   drawIcon: drawHandshake, label: "推薦好友", sub: "分享推薦碼給朋友" },
  { icon: "phone",   drawIcon: drawPhone,     label: "聯絡我們", sub: "免費客服專線" },
  { icon: "store",   drawIcon: drawMapPin,    label: "尋找門市", sub: "查詢附近服務據點" },
  { icon: "product", drawIcon: drawBathtub,   label: "產品目錄", sub: "瀏覽衛浴產品系列" },
  { icon: "switch",  drawIcon: drawSwitch,    label: "基本選單", sub: "切換至新客選單" },
];

console.log("Generating DEREK Rich Menu images...\n");

drawMenu(
  newCustomerCells,
  "DEREK 新客選單",
  "精 品 衛 浴  ·  頂 級 生 活 體 驗",
  true,
  "/tmp/richmenu-new-customer.png"
);

drawMenu(
  vipCustomerCells,
  "DEREK 熟客選單",
  "精 品 衛 浴  ·  尊 榮 貴 賓 服 務",
  false,
  "/tmp/richmenu-vip-customer.png"
);

console.log("\nNext steps:");
console.log("  1. Check images: open /tmp/richmenu-*.png");
console.log("  2. Deploy: npx tsx scripts/deploy-richmenu-pair.ts");
