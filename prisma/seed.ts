import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 1. Regions
  await prisma.region.createMany({
    data: [
      {
        name: "大台北・桃園・宜蘭",
        slug: "taipei",
        counties: ["台北市", "新北市", "基隆市", "桃園市", "宜蘭縣"],
        order: 1,
      },
      {
        name: "竹苗地區",
        slug: "hsinchu",
        counties: ["新竹市", "新竹縣", "苗栗縣"],
        order: 2,
      },
      {
        name: "中彰投雲地區",
        slug: "taichung",
        counties: ["台中市", "彰化縣", "南投縣", "雲林縣"],
        order: 3,
      },
      {
        name: "嘉南地區",
        slug: "tainan",
        counties: ["嘉義市", "嘉義縣", "台南市"],
        order: 4,
      },
      {
        name: "高屏台東地區",
        slug: "kaohsiung",
        counties: ["高雄市", "屏東縣", "台東縣"],
        order: 5,
      },
      {
        name: "花蓮地區",
        slug: "hualien",
        counties: ["花蓮縣"],
        order: 6,
      },
    ],
  });

  const regions = await prisma.region.findMany();
  const rid = (slug: string) => regions.find((r) => r.slug === slug)!.id;

  // 2. Stores
  await prisma.store.createMany({
    data: [
      // 大台北
      {
        name: "DEREK 台北展示間",
        type: "BRANCH",
        regionId: rid("taipei"),
        address: "待補",
        phone: "0800-063366",
        hours: "週一～五 08:00–17:00",
        order: 0,
      },
      {
        name: "隆拹實業",
        type: "DEALER",
        regionId: rid("taipei"),
        address: "待補",
        phone: "待補",
        hours: "待補",
        order: 1,
      },
      {
        name: "金大發企業",
        type: "DEALER",
        regionId: rid("taipei"),
        address: "待補",
        phone: "待補",
        hours: "待補",
        order: 2,
      },
      // 竹苗
      {
        name: "DEREK 新竹旗艦店",
        type: "FLAGSHIP",
        regionId: rid("hsinchu"),
        address: "待補",
        phone: "待補",
        hours: "週一～六 10:00–18:00",
        order: 0,
      },
      // 中彰投雲
      {
        name: "DEREK 台中旗艦店",
        type: "FLAGSHIP",
        regionId: rid("taichung"),
        address: "待補",
        phone: "待補",
        hours: "週一～六 10:00–18:00",
        order: 0,
      },
      // 嘉南
      {
        name: "DEREK 台南旗艦店",
        type: "FLAGSHIP",
        regionId: rid("tainan"),
        address: "待補",
        phone: "待補",
        hours: "週一～六 10:00–18:00",
        order: 0,
      },
      {
        name: "冠衛企業",
        type: "DEALER",
        regionId: rid("tainan"),
        address: "待補",
        phone: "待補",
        hours: "待補",
        order: 1,
      },
      {
        name: "奇旺開發",
        type: "DEALER",
        regionId: rid("tainan"),
        address: "待補",
        phone: "待補",
        hours: "待補",
        order: 2,
      },
      // 高屏台東
      {
        name: "DEREK 高雄旗艦店",
        type: "FLAGSHIP",
        regionId: rid("kaohsiung"),
        address: "待補",
        phone: "待補",
        hours: "週一～六 10:00–18:00",
        order: 0,
      },
      // 花蓮
      {
        name: "百健行",
        type: "GENERAL",
        regionId: rid("hualien"),
        address: "花蓮縣吉安鄉南山一街40號",
        phone: "038-511315",
        hours: "待補",
        order: 0,
      },
    ],
  });

  // 3. Auto Replies
  await prisma.autoReply.createMany({
    data: [
      {
        keyword: null,
        message:
          "親愛的顧客您好，DEREK 誠摯感謝您的來訊！\n此官方LINE為推播好康消息專區，恕無法於此回覆個人諮詢。\n請點選下方選單「尋找門市」，找到您所在地區的服務據點，由專屬小編為您服務 🙏",
        order: 99,
      },
      {
        keyword: "報價",
        message:
          "感謝您的詢問！報價相關請直接聯繫您所在地區的門市，點選下方「尋找門市」取得聯絡方式 📍",
        order: 1,
      },
      {
        keyword: "維修",
        message:
          "維修及保固服務請聯繫您當初購買的門市，點選「尋找門市」找到對應服務據點 🔧",
        order: 2,
      },
      { keyword: "門市", message: "SHOW_REGION_MENU", order: 3 },
      { keyword: "地點", message: "SHOW_REGION_MENU", order: 4 },
      { keyword: "哪裡", message: "SHOW_REGION_MENU", order: 5 },
      { keyword: "產品", message: "SHOW_PRODUCT_MENU", order: 6 },
      { keyword: "商品", message: "SHOW_PRODUCT_MENU", order: 7 },
    ],
  });

  // 4. Admin user
  await prisma.user.create({
    data: {
      email: "admin@derek.com.tw",
      password: hashSync("Derek@2025", 12),
      name: "系統管理員",
      role: "ADMIN",
    },
  });

  // 5. Site Settings
  await prisma.siteSetting.createMany({
    data: [
      {
        key: "welcome_message",
        label: "加好友歡迎訊息",
        value:
          "親愛的顧客您好 👋\n感謝您加入 DEREK 德瑞克衛浴！\n請點選下方選單「尋找門市」找到您附近的服務據點 🙏",
      },
      {
        key: "fallback_message",
        label: "系統忙碌提示",
        value: "系統暫時忙碌，請稍後再試 🙏",
      },
      {
        key: "region_menu_title",
        label: "地區選單標題",
        value: "📍 請選擇您所在的地區",
      },
      {
        key: "no_store_message",
        label: "無門市提示",
        value: "該地區目前沒有服務據點，請聯繫客服 📞",
      },
      {
        key: "store_intro_prefix",
        label: "門市卡片前綴文字",
        value: "以下是 {region} 的服務據點 👇",
      },
    ],
  });

  console.log("✅ Seed 完成：6地區、10門市、6自動回覆、1管理員、5系統設定");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
