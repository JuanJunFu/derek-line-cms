/**
 * Setup Rich Menu for DEREK LINE Bot — matching gold.html design
 * 4-grid layout: 尋找門市 | 聯絡我們 | 最新活動 | 品牌官網
 * With DEREK brand banner on top
 * Run: npx tsx scripts/setup-richmenu.ts
 */
import "dotenv/config";
import { createCanvas } from "canvas";
import fs from "fs";

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const API = "https://api.line.me/v2/bot";

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

async function main() {
  // Delete old rich menus
  console.log("Cleaning old rich menus...");
  try {
    const list = await lineApi("/richmenu/list");
    for (const rm of list.richmenus || []) {
      await fetch(`${API}/richmenu/${rm.richMenuId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      console.log(`  Deleted: ${rm.richMenuId}`);
    }
  } catch {}

  // 6-cell layout: banner(top) + 3x2 grid (DUKE 4/2 confirmed)
  const W = 2500, H = 1686;
  const bannerH = 380;
  const gridH = H - bannerH; // 1306
  const cellW = Math.floor(W / 3); // 833
  const cellH = Math.floor(gridH / 2); // 653

  // Helper — compute bounds for cell at (row, col)
  function cellBounds(row: number, col: number) {
    const isLastCol = col === 2;
    const isLastRow = row === 1;
    return {
      x: cellW * col,
      y: bannerH + cellH * row,
      width: isLastCol ? W - cellW * 2 : cellW,  // last col gets remainder
      height: isLastRow ? H - (bannerH + cellH) : cellH,
    };
  }

  console.log("Creating Rich Menu (6-grid + banner, v4)...");
  const richMenu = await lineApi("/richmenu", {
    method: "POST",
    body: JSON.stringify({
      size: { width: W, height: H },
      selected: true,
      name: "DEREK Main Menu v4",
      chatBarText: "選單",
      areas: [
        // Row 0
        { bounds: cellBounds(0, 0), action: { type: "postback", data: "action=SHOW_REGION_MENU",  displayText: "尋找門市" } },
        { bounds: cellBounds(0, 1), action: { type: "postback", data: "action=SHOW_PRODUCT_MENU", displayText: "產品目錄" } },
        { bounds: cellBounds(0, 2), action: { type: "uri", uri: "https://www.lcb.com.tw",         label: "品牌官網" } },
        // Row 1
        { bounds: cellBounds(1, 0), action: { type: "uri", uri: "https://www.lcb.com.tw/lcb/faq",  label: "常見問題" } },
        { bounds: cellBounds(1, 1), action: { type: "uri", uri: "https://www.facebook.com/LCB.TW/",    label: "粉絲專區" } },
        { bounds: cellBounds(1, 2), action: { type: "uri", uri: "https://www.lcb.com.tw/lcb/news",      label: "最新消息" } },
      ],
    }),
  });
  const richMenuId = richMenu.richMenuId;
  console.log("Rich Menu ID:", richMenuId);

  // Generate image matching gold.html
  console.log("Generating image...");
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // === Banner (top) — Blue system ===
  const grad = ctx.createLinearGradient(0, 0, W, bannerH);
  grad.addColorStop(0, "#0A2240");
  grad.addColorStop(0.5, "#061B36");
  grad.addColorStop(1, "#0A2240");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, bannerH);

  // Cornhusk accent line
  ctx.strokeStyle = "#E8D5B0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, bannerH - 2);
  ctx.lineTo(W, bannerH - 2);
  ctx.stroke();

  // DEREK brand text (Cornhusk)
  ctx.fillStyle = "#E8D5B0";
  ctx.font = "bold 150px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("D  E  R  E  K", W / 2, bannerH / 2 - 50);

  // Tagline
  ctx.fillStyle = "#8A9BA8";
  ctx.font = "44px sans-serif";
  ctx.fillText("精 品 衛 浴  ·  頂 級 生 活 體 驗", W / 2, bannerH / 2 + 30);

  // Sub badge
  ctx.fillStyle = "#5A85B0";
  ctx.font = "bold 38px sans-serif";
  ctx.fillText("德 瑞 克 衛 浴  官 方 服 務 選 單", W / 2, bannerH / 2 + 88);

  // === Grid (bottom) ===
  ctx.fillStyle = "#0D2444";
  ctx.fillRect(0, bannerH, W, gridH);

  // Grid lines (dark blue)
  ctx.strokeStyle = "#153460";
  ctx.lineWidth = 2;
  for (let col = 1; col < 3; col++) {
    ctx.beginPath();
    ctx.moveTo(cellW * col, bannerH);
    ctx.lineTo(cellW * col, H - 50);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, bannerH + cellH);
  ctx.lineTo(W, bannerH + cellH);
  ctx.stroke();

  // Cell labels with colored dots as icons (simple fallback without canvas icons)
  const cells6 = [
    { dot: "#1B4F8C", label: "門市 & 維修", sub: "查詢門市｜預約維修" },
    { dot: "#2980B9", label: "產品目錄",    sub: "瀏覽衛浴產品系列" },
    { dot: "#0F2D5A", label: "品牌官網",    sub: "lcb.com.tw" },
    { dot: "#5A85B0", label: "常見問題",    sub: "產品Q&A解答" },
    { dot: "#1877F2", label: "粉絲專區",    sub: "追蹤我們的動態" },
    { dot: "#2C7BB6", label: "最新消息",    sub: "活動優惠搶先看" },
  ];

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      const cell = cells6[idx];
      const cx = cellW * col + cellW / 2;
      const cy = bannerH + cellH * row + cellH / 2;

      // Colored circle icon
      ctx.beginPath();
      ctx.arc(cx, cy - 80, 80, 0, Math.PI * 2);
      ctx.fillStyle = cell.dot;
      ctx.fill();

      // Label
      ctx.fillStyle = "#EEEEEE";
      ctx.font = "bold 78px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cell.label, cx, cy + 55);

      // Sub label
      ctx.fillStyle = "#8A9BA8";
      ctx.font = "42px sans-serif";
      ctx.fillText(cell.sub, cx, cy + 122);
    }
  }

  // Bottom brand bar (Cornhusk)
  ctx.fillStyle = "#E8D5B0";
  ctx.fillRect(0, H - 50, W, 50);
  ctx.fillStyle = "#061B36";
  ctx.font = "bold 30px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DEREK 德瑞克衛浴  |  0800-063-366  |  www.lcb.com.tw", W / 2, H - 25);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync("/tmp/richmenu-v4.png", buffer);
  console.log("Image saved → /tmp/richmenu-v4.png");

  // Upload image
  console.log("Uploading image...");
  const imgRes = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "image/png",
      },
      body: buffer as any,
    }
  );
  if (!imgRes.ok) throw new Error(`Upload: ${imgRes.status} ${await imgRes.text()}`);
  console.log("Image uploaded!");

  // Set as default
  console.log("Setting as default...");
  await fetch(`${API}/user/all/richmenu/${richMenuId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  console.log("✅ Rich Menu v4 setup complete!");
  console.log(`   ID: ${richMenuId}`);
  console.log("   Layout: 6-grid (門市&維修 | 產品目錄 | 品牌官網 | 常見問題 | 粉絲專區 | 最新消息)");
}

main().catch(console.error);
