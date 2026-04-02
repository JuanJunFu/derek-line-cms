/**
 * One-time script: upsert new SiteSettings to the running database
 * Run: npx tsx scripts/seed-new-settings.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NEW_SETTINGS = [
  {
    key: "area_managers",
    label: "區域負責人名單（JSON）",
    value: JSON.stringify([
      { label: "北區負責人", area: "台北 / 新北", lineUri: "https://line.me/ti/p/yuVxQMJgM0" },
      { label: "新竹負責人", area: "新竹",        lineUri: "https://line.me/ti/p/45qv_saITI" },
      { label: "台中負責人", area: "台中",        lineUri: "https://line.me/ti/p/PcMG5PT2a-" },
      { label: "台南負責人", area: "台南",        lineUri: "https://line.me/ti/p/VQ1Qd3eY4Q" },
      { label: "高雄負責人", area: "高雄",        lineUri: "https://lin.ee/mwJ2Mdi" },
    ]),
  },
  {
    key: "repair_line_message",
    label: "維修預填訊息",
    value: "您好，我透過DEREK官方帳號找到您，想預約採購或維修服務，請問方便協助嗎？",
  },
  {
    key: "friends_intro_message",
    label: "區域負責人引導文字",
    value: "以下是全台各地區域負責人，加入好友後可直接諮詢採購或預約維修 👇",
  },
  {
    key: "repair_store_intro",
    label: "維修門市引導文字",
    value: "以下是 {region} 的維修服務據點，請依序：① 加好友 → ② 發送維修訊息 🔧",
  },
];

async function main() {
  console.log("🔧 Upserting new settings...\n");
  for (const setting of NEW_SETTINGS) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: { label: setting.label },  // don't overwrite value if already customized
      create: setting,
    });
    console.log(`  ✅ ${setting.key}`);
  }
  console.log("\n✅ Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
