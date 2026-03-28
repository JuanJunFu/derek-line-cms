/**
 * Seed script for new settings added in this update.
 * Run with: npx tsx prisma/seed-new-settings.ts
 *
 * Safe to run multiple times — uses upsert to avoid duplicates.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NEW_SETTINGS = [
  { key: "line_oa_id_production", label: "正式 LINE OA ID", value: "@417cnroq" },
  { key: "line_oa_id_test", label: "測試 LINE OA ID", value: "@897utgnk" },
  { key: "line_oa_url_production", label: "正式 LINE 加好友連結", value: "https://line.me/R/ti/p/@417cnroq" },
  { key: "line_oa_url_test", label: "測試 LINE 加好友連結", value: "https://line.me/R/ti/p/@897utgnk" },
  { key: "line_active_env", label: "LINE 使用環境", value: "production" },
  { key: "referral_brand_name", label: "推薦卡片品牌名稱", value: "DEREK 德瑞克衛浴" },
  { key: "referral_share_text", label: "推薦分享訊息模板", value: "🤝 {brand} — 好友推薦\n\n我的推薦碼：{code}\n\n👉 點擊加入並自動輸入推薦碼：\n{url}" },
  { key: "flex_brand_color", label: "Flex 訊息品牌色（HEX）", value: "#B89A6A" },
  { key: "flex_brand_name", label: "Flex 訊息品牌名稱", value: "DEREK 德瑞克衛浴" },
  { key: "flex_welcome_title", label: "歡迎 Flex 標題", value: "打造理想衛浴空間" },
  { key: "flex_welcome_body", label: "歡迎 Flex 內文", value: "感謝您加入 DEREK 官方帳號！\n我們提供馬桶、面盆、龍頭、浴缸等完整衛浴解決方案，全台多間門市均可親身體驗。" },
  { key: "flex_day3_title", label: "Day3 品類教育標題", value: "🏠 衛浴怎麼選？" },
  { key: "flex_day3_body", label: "Day3 品類教育內文", value: "不同需求有不同重點，3分鐘了解衛浴產品怎麼挑" },
  { key: "flex_day30_title", label: "Day30 追蹤標題", value: "DEREK 關心您 👋" },
  { key: "flex_day30_body", label: "Day30 追蹤內文", value: "找到您需要的衛浴了嗎？\n我們的門市顧問很樂意為您提供專業建議。" },
  { key: "flex_repair_phone", label: "維修服務電話", value: "0800-063366" },
  { key: "flex_repair_hours", label: "維修服務時間", value: "週一至週六 9:00-18:00" },
];

async function main() {
  for (const s of NEW_SETTINGS) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      create: s,
      update: {}, // Don't overwrite existing values
    });
  }
  console.log(`✅ ${NEW_SETTINGS.length} 個新設定已寫入（已存在的不覆蓋）`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
