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

  // gold.html layout: banner(top 30%) + 2x2 grid(bottom 70%)
  const W = 2500, H = 1686;
  const bannerH = 506; // top 30%
  const gridH = H - bannerH; // bottom 70% = 1180
  const cellW = W / 2; // 1250
  const cellH = gridH / 2; // 590

  console.log("Creating Rich Menu (4-grid + banner)...");
  const richMenu = await lineApi("/richmenu", {
    method: "POST",
    body: JSON.stringify({
      size: { width: W, height: H },
      selected: true,
      name: "DEREK Main Menu v3",
      chatBarText: "選單",
      areas: [
        // Top-left: 尋找門市
        {
          bounds: { x: 0, y: bannerH, width: cellW, height: cellH },
          action: { type: "message", text: "門市" },
        },
        // Top-right: 聯絡我們
        {
          bounds: { x: cellW, y: bannerH, width: cellW, height: cellH },
          action: { type: "uri", uri: "tel:0800063366", label: "聯絡我們" },
        },
        // Bottom-left: 產品分類（取代「最新活動」— 可追蹤）
        {
          bounds: { x: 0, y: bannerH + cellH, width: cellW, height: cellH },
          action: { type: "message", text: "產品" },
        },
        // Bottom-right: 品牌官網
        {
          bounds: { x: cellW, y: bannerH + cellH, width: cellW, height: cellH },
          action: { type: "uri", uri: "https://www.lcb.com.tw", label: "品牌官網" },
        },
      ],
    }),
  });
  const richMenuId = richMenu.richMenuId;
  console.log("Rich Menu ID:", richMenuId);

  // Generate image matching gold.html
  console.log("Generating image...");
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // === Banner (top) ===
  const grad = ctx.createLinearGradient(0, 0, W, bannerH);
  grad.addColorStop(0, "#222222");
  grad.addColorStop(1, "#111111");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, bannerH);

  // Brand line
  ctx.strokeStyle = "#B89A6A";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, bannerH - 1);
  ctx.lineTo(W, bannerH - 1);
  ctx.stroke();

  // DEREK text (large)
  ctx.fillStyle = "#B89A6A";
  ctx.font = "bold 160px serif";
  ctx.textAlign = "center";
  ctx.fillText("D  E  R  E  K", W / 2, bannerH / 2 - 10);

  // Subtitle
  ctx.fillStyle = "#666666";
  ctx.font = "48px sans-serif";
  ctx.fillText("精 品 衛 浴  ·  頂 級 生 活 體 驗", W / 2, bannerH / 2 + 70);

  // === Grid (bottom) ===
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, bannerH, W, gridH);

  // Grid lines
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 2;
  // Vertical center
  ctx.beginPath();
  ctx.moveTo(cellW, bannerH);
  ctx.lineTo(cellW, H);
  ctx.stroke();
  // Horizontal center
  ctx.beginPath();
  ctx.moveTo(0, bannerH + cellH);
  ctx.lineTo(W, bannerH + cellH);
  ctx.stroke();

  // Cell contents
  const cells = [
    { emoji: "📍", label: "尋找門市", sub: "查詢附近服務據點", x: cellW / 2, y: bannerH },
    { emoji: "📞", label: "聯絡我們", sub: "免費客服專線", x: cellW + cellW / 2, y: bannerH },
    { emoji: "🛁", label: "產品分類", sub: "瀏覽衛浴產品系列", x: cellW / 2, y: bannerH + cellH },
    { emoji: "🌐", label: "品牌官網", sub: "瀏覽最新產品資訊", x: cellW + cellW / 2, y: bannerH + cellH },
  ];

  for (const cell of cells) {
    const cy = cell.y + cellH / 2;

    // Emoji
    ctx.font = "120px sans-serif";
    ctx.fillStyle = "#B89A6A";
    ctx.textAlign = "center";
    ctx.fillText(cell.emoji, cell.x, cy - 50);

    // Label (4x larger)
    ctx.fillStyle = "#B89A6A";
    ctx.font = "bold 72px sans-serif";
    ctx.fillText(cell.label, cell.x, cy + 50);

    // Sub label
    ctx.fillStyle = "#666666";
    ctx.font = "36px sans-serif";
    ctx.fillText(cell.sub, cell.x, cy + 110);
  }

  // Bottom brand bar
  ctx.fillStyle = "#B89A6A";
  ctx.fillRect(0, H - 60, W, 60);
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText("DEREK 德瑞克衛浴", W / 2, H - 18);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync("/tmp/richmenu-v2.png", buffer);
  console.log("Image saved");

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

  console.log("✅ Rich Menu v2 setup complete!");
  console.log(`   ID: ${richMenuId}`);
  console.log("   Layout: 4-grid (尋找門市 | 聯絡我們 | 最新活動 | 品牌官網)");
}

main().catch(console.error);
