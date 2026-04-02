/**
 * Generate Rich Menu image for DEREK LINE Bot
 * 2x3 grid (6 areas) with DEREK brand banner
 * Blue color system: Classic Blue (#1B4F8C) + Cornhusk (#E8D5B0)
 *
 * Run: npx tsx scripts/generate-richmenu-images.ts
 * Output: /tmp/richmenu-derek.png
 */
import { createCanvas, type CanvasRenderingContext2D } from "canvas";
import fs from "fs";

const W = 2500;
const H = 1686;
const BANNER_H = 380;
const GRID_H = H - BANNER_H;
const COLS = 3;
const ROWS = 2;
const CELL_W = Math.floor(W / COLS); // 833
const CELL_H = Math.floor(GRID_H / ROWS); // 653

// ── Brand Colors (Blue System) ──
const BG_BANNER = "#061B36";        // Deep navy — banner background
const BG_CELL = "#0D2444";          // Dark navy — cell background
const BRAND_BLUE = "#1B4F8C";       // Classic Blue — main brand
const CORNHUSK = "#E8D5B0";         // Cornhusk — warm accent (replaces gold)
const TEXT_WHITE = "#EEEEEE";
const TEXT_DIM = "#8A9BA8";         // Monument — secondary text
const GRID_LINE = "#153460";        // Dark blue grid lines

// ── Icon palette (blue family) ──
const ICON_COLORS: Record<string, { bg: string; fg: string }> = {
  store:   { bg: "#1B4F8C", fg: "#E8D5B0" }, // Classic Blue + Cornhusk
  product: { bg: "#2980B9", fg: "#ffffff" }, // Bright Blue
  web:     { bg: "#0F2D5A", fg: "#C8DCF0" }, // Navy + Baby Blue
  faq:     { bg: "#5A85B0", fg: "#ffffff" }, // Provence Blue
  fb:      { bg: "#1877F2", fg: "#ffffff" }, // Facebook Blue
  news:    { bg: "#2C7BB6", fg: "#ffffff" }, // News Blue
};

// ── Icon drawing functions ──

function drawMapPinWrench(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  colors: { bg: string; fg: string }
) {
  // Circle background
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = colors.bg;
  ctx.fill();

  const s = r * 0.5;

  // Map pin (left side)
  ctx.fillStyle = colors.fg;
  ctx.beginPath();
  ctx.arc(cx - s * 0.35, cy - s * 0.2, s * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.62, cy + s * 0.1);
  ctx.lineTo(cx - s * 0.35, cy + s * 0.75);
  ctx.lineTo(cx - s * 0.08, cy + s * 0.1);
  ctx.fill();
  ctx.fillStyle = colors.bg;
  ctx.beginPath();
  ctx.arc(cx - s * 0.35, cy - s * 0.2, s * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // Small wrench (right side)
  ctx.save();
  ctx.translate(cx + s * 0.55, cy + s * 0.1);
  ctx.rotate(-Math.PI / 5);
  ctx.fillStyle = colors.fg;
  const ws = s * 0.38;
  ctx.beginPath();
  ctx.moveTo(-ws * 0.2, -ws * 0.9);
  ctx.lineTo(-ws * 0.48, -ws * 0.58);
  ctx.lineTo(-ws * 0.3, -ws * 0.4);
  ctx.lineTo(-ws * 0.18, -ws * 0.45);
  ctx.lineTo(ws * 0.18, -ws * 0.45);
  ctx.lineTo(ws * 0.3, -ws * 0.4);
  ctx.lineTo(ws * 0.48, -ws * 0.58);
  ctx.lineTo(ws * 0.2, -ws * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-ws * 0.15, -ws * 0.45, ws * 0.3, ws * 1.2);
  ctx.beginPath();
  ctx.arc(0, ws * 0.75, ws * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBathtub(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  colors: { bg: string; fg: string }
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = colors.bg;
  ctx.fill();

  const s = r * 0.5;
  ctx.strokeStyle = colors.fg;
  ctx.lineWidth = s * 0.2;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.8, cy - s * 0.1);
  ctx.lineTo(cx - s * 0.8, cy + s * 0.3);
  ctx.quadraticCurveTo(cx - s * 0.8, cy + s * 0.7, cx - s * 0.3, cy + s * 0.7);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.7);
  ctx.quadraticCurveTo(cx + s * 0.8, cy + s * 0.7, cx + s * 0.8, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.8, cy - s * 0.1);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - s, cy - s * 0.1);
  ctx.lineTo(cx + s, cy - s * 0.1);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy - s * 0.1);
  ctx.lineTo(cx - s * 0.3, cy - s * 0.55);
  ctx.lineTo(cx + s * 0.05, cy - s * 0.55);
  ctx.stroke();

  ctx.fillStyle = colors.fg;
  ctx.beginPath();
  ctx.arc(cx + s * 0.05, cy - s * 0.35, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawGlobe(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  colors: { bg: string; fg: string }
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = colors.bg;
  ctx.fill();

  const s = r * 0.55;
  ctx.strokeStyle = colors.fg;
  ctx.lineWidth = s * 0.12;

  ctx.beginPath();
  ctx.arc(cx, cy, s, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.45, s, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - s, cy);
  ctx.lineTo(cx + s, cy);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.85, cy - s * 0.4);
  ctx.quadraticCurveTo(cx, cy - s * 0.55, cx + s * 0.85, cy - s * 0.4);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.85, cy + s * 0.4);
  ctx.quadraticCurveTo(cx, cy + s * 0.55, cx + s * 0.85, cy + s * 0.4);
  ctx.stroke();
}

function drawQuestion(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  colors: { bg: string; fg: string }
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = colors.bg;
  ctx.fill();

  const s = r * 0.55;

  // Question mark arc
  ctx.strokeStyle = colors.fg;
  ctx.lineWidth = s * 0.22;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, cy - s * 0.5);
  ctx.bezierCurveTo(
    cx - s * 0.35, cy - s * 0.85,
    cx + s * 0.45, cy - s * 0.85,
    cx + s * 0.45, cy - s * 0.4
  );
  ctx.bezierCurveTo(
    cx + s * 0.45, cy - s * 0.1,
    cx + s * 0.05, cy - s * 0.1,
    cx + s * 0.05, cy + s * 0.15
  );
  ctx.stroke();

  // Dot
  ctx.fillStyle = colors.fg;
  ctx.beginPath();
  ctx.arc(cx + s * 0.05, cy + s * 0.55, s * 0.14, 0, Math.PI * 2);
  ctx.fill();
}

function drawFacebook(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  colors: { bg: string; fg: string }
) {
  // Rounded square background
  const size = r * 1.4;
  const rd = r * 0.28;
  ctx.beginPath();
  ctx.moveTo(cx - size / 2 + rd, cy - size / 2);
  ctx.lineTo(cx + size / 2 - rd, cy - size / 2);
  ctx.quadraticCurveTo(cx + size / 2, cy - size / 2, cx + size / 2, cy - size / 2 + rd);
  ctx.lineTo(cx + size / 2, cy + size / 2 - rd);
  ctx.quadraticCurveTo(cx + size / 2, cy + size / 2, cx + size / 2 - rd, cy + size / 2);
  ctx.lineTo(cx - size / 2 + rd, cy + size / 2);
  ctx.quadraticCurveTo(cx - size / 2, cy + size / 2, cx - size / 2, cy + size / 2 - rd);
  ctx.lineTo(cx - size / 2, cy - size / 2 + rd);
  ctx.quadraticCurveTo(cx - size / 2, cy - size / 2, cx - size / 2 + rd, cy - size / 2);
  ctx.closePath();
  ctx.fillStyle = colors.bg;
  ctx.fill();

  // "f" letterform
  const s = r * 0.5;
  ctx.fillStyle = colors.fg;
  ctx.strokeStyle = colors.fg;
  ctx.lineWidth = s * 0.35;
  ctx.lineCap = "round";

  // Vertical stroke
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.1, cy - s * 0.85);
  ctx.lineTo(cx + s * 0.1, cy + s * 0.85);
  ctx.stroke();

  // Top arc of f
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.1, cy - s * 0.55);
  ctx.bezierCurveTo(
    cx + s * 0.1, cy - s * 0.85,
    cx + s * 0.65, cy - s * 0.85,
    cx + s * 0.65, cy - s * 0.55
  );
  ctx.stroke();

  // Crossbar
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.25, cy - s * 0.15);
  ctx.lineTo(cx + s * 0.5, cy - s * 0.15);
  ctx.stroke();
}

function drawBell(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  colors: { bg: string; fg: string }
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = colors.bg;
  ctx.fill();

  const s = r * 0.52;
  ctx.fillStyle = colors.fg;

  // Bell body
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.08, cy - s * 0.85);
  ctx.bezierCurveTo(cx - s * 0.08, cy - s * 0.85, cx - s * 0.7, cy - s * 0.6, cx - s * 0.75, cy + s * 0.2);
  ctx.lineTo(cx + s * 0.75, cy + s * 0.2);
  ctx.bezierCurveTo(cx + s * 0.7, cy - s * 0.6, cx + s * 0.08, cy - s * 0.85, cx + s * 0.08, cy - s * 0.85);
  ctx.closePath();
  ctx.fill();

  // Bell base bar
  ctx.fillRect(cx - s * 0.85, cy + s * 0.2, s * 1.7, s * 0.2);

  // Clapper
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.55, s * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // Small dot on top (stem)
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.85, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

type IconFn = (
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  colors: { bg: string; fg: string }
) => void;

type CellDef = {
  icon: string;
  drawIcon: IconFn;
  label: string;
  sub: string;
};

// ── 6-cell unified layout (DUKE 4/2 confirmed) ──
const menuCells: CellDef[] = [
  { icon: "store",   drawIcon: drawMapPinWrench, label: "門市 & 維修", sub: "查詢門市｜預約維修" },
  { icon: "product", drawIcon: drawBathtub,      label: "產品目錄",    sub: "瀏覽衛浴產品系列" },
  { icon: "web",     drawIcon: drawGlobe,        label: "品牌官網",    sub: "lcb.com.tw" },
  { icon: "faq",     drawIcon: drawQuestion,     label: "常見問題",    sub: "產品Q&A解答" },
  { icon: "fb",      drawIcon: drawFacebook,     label: "粉絲專區",    sub: "追蹤我們的動態" },
  { icon: "news",    drawIcon: drawBell,         label: "最新消息",    sub: "活動優惠搶先看" },
];

function drawMenu(cells: CellDef[], filename: string) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── Banner (top) ──
  const bannerGrad = ctx.createLinearGradient(0, 0, W, BANNER_H);
  bannerGrad.addColorStop(0, "#0A2240");
  bannerGrad.addColorStop(0.5, BG_BANNER);
  bannerGrad.addColorStop(1, "#0A2240");
  ctx.fillStyle = bannerGrad;
  ctx.fillRect(0, 0, W, BANNER_H);

  // Cornhusk accent line under banner
  const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
  lineGrad.addColorStop(0, "rgba(232,213,176,0)");
  lineGrad.addColorStop(0.15, CORNHUSK);
  lineGrad.addColorStop(0.85, CORNHUSK);
  lineGrad.addColorStop(1, "rgba(232,213,176,0)");
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, BANNER_H - 2);
  ctx.lineTo(W, BANNER_H - 2);
  ctx.stroke();

  // DEREK brand text
  ctx.fillStyle = CORNHUSK;
  ctx.font = "bold 140px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("D  E  R  E  K", W / 2, BANNER_H / 2 - 55);

  // Tagline
  ctx.fillStyle = TEXT_DIM;
  ctx.font = "42px sans-serif";
  ctx.fillText("精 品 衛 浴  ·  頂 級 生 活 體 驗", W / 2, BANNER_H / 2 + 25);

  // Subtitle in brand blue
  ctx.fillStyle = "#5A85B0";
  ctx.font = "bold 38px sans-serif";
  ctx.fillText("德 瑞 克 衛 浴  官 方 服 務 選 單", W / 2, BANNER_H / 2 + 88);

  // ── Cell background ──
  ctx.fillStyle = BG_CELL;
  ctx.fillRect(0, BANNER_H, W, GRID_H);

  // ── Grid lines ──
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
  const ICON_R = 82;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col;
      if (idx >= cells.length) break;

      const cell = cells[idx];
      const cx = CELL_W * col + CELL_W / 2;
      const cy = BANNER_H + CELL_H * row + CELL_H / 2;
      const colors = ICON_COLORS[cell.icon];

      // Subtle radial glow behind icon
      const glow = ctx.createRadialGradient(cx, cy - 20, 0, cx, cy - 20, ICON_R * 2.5);
      glow.addColorStop(0, BRAND_BLUE + "22");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(CELL_W * col, BANNER_H + CELL_H * row, CELL_W, CELL_H);

      // Icon (shifted up)
      cell.drawIcon(ctx, cx, cy - 65, ICON_R, colors);

      // Label
      ctx.fillStyle = TEXT_WHITE;
      ctx.font = "bold 80px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cell.label, cx, cy + 55);

      // Sub label
      ctx.fillStyle = TEXT_DIM;
      ctx.font = "44px sans-serif";
      ctx.fillText(cell.sub, cx, cy + 122);
    }
  }

  // ── Bottom brand bar (Cornhusk) ──
  ctx.fillStyle = CORNHUSK;
  ctx.fillRect(0, H - 50, W, 50);
  ctx.fillStyle = BG_BANNER;
  ctx.font = "bold 30px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DEREK 德瑞克衛浴  |  0800-063-366  |  www.lcb.com.tw", W / 2, H - 25);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(filename, buffer);
  console.log(`Generated ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

console.log("Generating DEREK Rich Menu image...\n");

drawMenu(menuCells, "/tmp/richmenu-derek.png");

// Also keep legacy filenames so deploy-richmenu-pair.ts still works
fs.copyFileSync("/tmp/richmenu-derek.png", "/tmp/richmenu-new-customer.png");
fs.copyFileSync("/tmp/richmenu-derek.png", "/tmp/richmenu-vip-customer.png");
console.log("Copied to legacy filenames (new-customer / vip-customer)");

console.log("\nNext step:");
console.log("  Deploy: npx tsx scripts/deploy-richmenu-pair.ts");
