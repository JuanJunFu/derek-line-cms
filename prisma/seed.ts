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
      // 大台北 — 旗艦門市（DUKE 4/2 提供）
      {
        name: "DEREK 北區旗艦門市",
        type: "FLAGSHIP",
        regionId: rid("taipei"),
        address: "新北市鶯歌區鶯桃路41號",
        phone: "02-2670-3360",
        lineId: "https://line.me/ti/p/yuVxQMJgM0",
        hours: "週一～日 09:00–17:30",
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
      // 竹苗 — 旗艦門市（DUKE 4/2 提供）
      {
        name: "DEREK 新竹旗艦門市",
        type: "FLAGSHIP",
        regionId: rid("hsinchu"),
        address: "新竹縣竹北市莊敬北路220號",
        phone: "03-5509-480",
        lineId: "https://line.me/ti/p/45qv_saITI",
        hours: "週一～日 09:00–17:30",
        order: 0,
      },
      // 中彰投雲 — 旗艦門市（DUKE 4/2 提供）
      {
        name: "DEREK 台中旗艦門市",
        type: "FLAGSHIP",
        regionId: rid("taichung"),
        address: "台中市西區英才路581號",
        phone: "04-2375-0808",
        lineId: "https://line.me/ti/p/PcMG5PT2a-",
        hours: "週一～日 09:00–17:30",
        order: 0,
      },
      // 嘉南 — 旗艦門市（DUKE 4/2 提供）
      {
        name: "DEREK 台南旗艦門市",
        type: "FLAGSHIP",
        regionId: rid("tainan"),
        address: "台南市安平區華平路148號",
        phone: "06-2979-606",
        lineId: "https://line.me/ti/p/VQ1Qd3eY4Q",
        hours: "週一～日 09:00–17:30",
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
      // 高屏台東 — 旗艦門市（DUKE 4/2 提供）
      {
        name: "DEREK 高雄旗艦門市",
        type: "FLAGSHIP",
        regionId: rid("kaohsiung"),
        address: "高雄市前鎮區復興三路66號",
        phone: "07-5528-566",
        lineId: "https://lin.ee/mwJ2Mdi",
        hours: "週一～日 09:00–17:30",
        order: 0,
      },
      // 花蓮 — 總經銷（DUKE 4/2 提供）
      {
        name: "百健行",
        type: "GENERAL",
        regionId: rid("hualien"),
        address: "花蓮縣吉安鄉南山一街40號",
        phone: "038-511315",
        hours: "週一～五 08:00-12:00 13:30-17:30（國定假日公休）",
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
      // ── LINE 官方帳號設定 ──
      {
        key: "line_oa_id_production",
        label: "正式 LINE OA ID",
        value: "@417cnroq",
      },
      {
        key: "line_oa_id_test",
        label: "測試 LINE OA ID",
        value: "@897utgnk",
      },
      {
        key: "line_oa_url_production",
        label: "正式 LINE 加好友連結",
        value: "https://line.me/R/ti/p/@417cnroq",
      },
      {
        key: "line_oa_url_test",
        label: "測試 LINE 加好友連結",
        value: "https://line.me/R/ti/p/@897utgnk",
      },
      {
        key: "line_active_env",
        label: "LINE 使用環境",
        value: "production",
      },
      // ── 推薦訊息設定 ──
      {
        key: "referral_brand_name",
        label: "推薦卡片品牌名稱",
        value: "DEREK 德瑞克衛浴",
      },
      {
        key: "referral_share_text",
        label: "推薦分享訊息模板",
        value: "🤝 {brand} — 好友推薦\n\n我的推薦碼：{code}\n\n👉 點擊加入並自動輸入推薦碼：\n{url}",
      },
      // ── Flex 訊息模板設定 ──
      {
        key: "flex_brand_color",
        label: "Flex 訊息品牌色（HEX）",
        value: "#B89A6A",
      },
      {
        key: "flex_brand_name",
        label: "Flex 訊息品牌名稱",
        value: "DEREK 德瑞克衛浴",
      },
      {
        key: "flex_welcome_title",
        label: "歡迎 Flex 標題",
        value: "打造理想衛浴空間",
      },
      {
        key: "flex_welcome_body",
        label: "歡迎 Flex 內文",
        value: "感謝您加入 DEREK 官方帳號！\n我們提供馬桶、面盆、龍頭、浴缸等完整衛浴解決方案，全台多間門市均可親身體驗。",
      },
      {
        key: "flex_day3_title",
        label: "Day3 品類教育標題",
        value: "🏠 衛浴怎麼選？",
      },
      {
        key: "flex_day3_body",
        label: "Day3 品類教育內文",
        value: "不同需求有不同重點，3分鐘了解衛浴產品怎麼挑",
      },
      {
        key: "flex_day30_title",
        label: "Day30 追蹤標題",
        value: "DEREK 關心您 👋",
      },
      {
        key: "flex_day30_body",
        label: "Day30 追蹤內文",
        value: "找到您需要的衛浴了嗎？\n我們的門市顧問很樂意為您提供專業建議。",
      },
      {
        key: "flex_repair_phone",
        label: "維修服務電話",
        value: "0800-063366",
      },
      {
        key: "flex_repair_hours",
        label: "維修服務時間",
        value: "週一至週六 9:00-18:00",
      },
    ],
  });

  // 6. Product Categories
  const BASE = "https://www.lcb.com.tw";
  const productCategories = [
    { slug: "toilet", name: "馬桶", emoji: "🚽", intent: "Comfort_High", url: `${BASE}/lcb/Apro`, order: 0, subs: [
      { slug: "toilet_smart", name: "智慧馬桶", url: `${BASE}/lcb/Apro_1` },
      { slug: "toilet_one", name: "單體馬桶", url: `${BASE}/lcb/Apro_2` },
      { slug: "toilet_two", name: "分體馬桶", url: `${BASE}/lcb/Apro_3` },
      { slug: "toilet_child", name: "幼兒馬桶", url: `${BASE}/lcb/Apro_4` },
      { slug: "toilet_squat", name: "蹲式馬桶", url: `${BASE}/lcb/Apro_5` },
    ]},
    { slug: "bidet", name: "免治馬桶座", emoji: "💺", intent: "Comfort_High", url: `${BASE}/lcb/Bpro`, order: 1, subs: [
      { slug: "bidet_luxury", name: "奢華系列", url: `${BASE}/lcb/Bpro_1` },
      { slug: "bidet_urban", name: "都會系列", url: `${BASE}/lcb/Bpro_2` },
    ]},
    { slug: "basin", name: "面盆/浴櫃", emoji: "🪥", intent: "Storage_Space", url: `${BASE}/lcb/Cpro`, order: 2, subs: [
      { slug: "basin_under", name: "下嵌盆", url: `${BASE}/lcb/Cpro_2` },
      { slug: "basin_top", name: "典雅檯上盆", url: `${BASE}/lcb/Cpro_1` },
      { slug: "basin_one", name: "時尚一體盆", url: `${BASE}/lcb/Cpro_3` },
      { slug: "basin_small", name: "小空間面盆", url: `${BASE}/lcb/Cpro_4` },
      { slug: "basin_wall", name: "經典壁掛盆", url: `${BASE}/lcb/Cpro_5` },
    ]},
    { slug: "faucet", name: "浴室龍頭", emoji: "🚿", intent: "Quick_Fix", url: `${BASE}/lcb/Dpro`, order: 3, subs: [
      { slug: "faucet_basin", name: "面盆龍頭", url: `${BASE}/lcb/Dpro_1` },
      { slug: "faucet_shower", name: "沐浴龍頭", url: `${BASE}/lcb/Dpro_2` },
      { slug: "faucet_steel", name: "不鏽鋼龍頭", url: `${BASE}/lcb/Dpro_3` },
      { slug: "faucet_sensor", name: "感應龍頭", url: `${BASE}/lcb/Dpro_4` },
      { slug: "faucet_leadfree", name: "無鉛龍頭", url: `${BASE}/lcb/Dpro_5` },
      { slug: "faucet_tub", name: "浴缸龍頭", url: `${BASE}/lcb/Dpro_6` },
      { slug: "faucet_rain", name: "花灑龍頭", url: `${BASE}/lcb/Dpro_7` },
      { slug: "faucet_hand", name: "手持蓮蓬頭", url: `${BASE}/lcb/Dpro_8` },
    ]},
    { slug: "accessibility", name: "無障礙設備", emoji: "♿", intent: "Safety_Care", url: `${BASE}/lcb/Epro`, order: 4, subs: [] },
    { slug: "bathtub", name: "浴缸", emoji: "🛁", intent: "Luxury_Living", url: `${BASE}/lcb/Fpro`, order: 5, subs: [
      { slug: "tub_free", name: "獨立浴缸", url: `${BASE}/lcb/Fpro_1` },
      { slug: "tub_built", name: "嵌入式浴缸", url: `${BASE}/lcb/Fpro_2` },
    ]},
    { slug: "accessories", name: "浴室配件", emoji: "🔧", intent: "Maintenance", url: `${BASE}/lcb/Gpro`, order: 6, subs: [
      { slug: "acc_mirror", name: "鏡面／鏡櫃", url: `${BASE}/lcb/Gpro_1` },
      { slug: "acc_appliance", name: "多功能家電", url: `${BASE}/lcb/Gpro_4` },
      { slug: "acc_shelf", name: "置物架／櫃", url: `${BASE}/lcb/Gpro_5` },
      { slug: "acc_towel", name: "毛巾架／環／勾", url: `${BASE}/lcb/Gpro_6` },
      { slug: "acc_hook", name: "掛衣勾", url: `${BASE}/lcb/Gpro_7` },
      { slug: "acc_bar", name: "滑桿", url: `${BASE}/lcb/Gpro_8` },
      { slug: "acc_paper", name: "衛生紙架／盒", url: `${BASE}/lcb/Gpro_9` },
      { slug: "acc_cup", name: "杯子／肥皂架", url: `${BASE}/lcb/Gpro_10` },
      { slug: "acc_lid", name: "馬桶蓋", url: `${BASE}/lcb/Gpro_11` },
      { slug: "acc_other", name: "其他配件", url: `${BASE}/lcb/Gpro_3` },
    ]},
    { slug: "urinal", name: "小便斗", emoji: "🚹", intent: "Luxury_Living", url: `${BASE}/lcb/Hpro`, order: 7, subs: [
      { slug: "urinal_wall", name: "壁掛式便斗", url: `${BASE}/lcb/Hpro_1` },
      { slug: "urinal_floor", name: "落地式便斗", url: `${BASE}/lcb/Hpro_2` },
      { slug: "urinal_child", name: "幼兒便斗", url: `${BASE}/lcb/Hpro_3` },
    ]},
    { slug: "commercial", name: "公共空間", emoji: "🏢", intent: "Maintenance", url: `${BASE}/lcb/Ipro`, order: 8, subs: [
      { slug: "comm_kitchen", name: "廚房龍頭", url: `${BASE}/lcb/Ipro_1` },
      { slug: "comm_wall", name: "壁式龍頭", url: `${BASE}/lcb/Ipro_2` },
      { slug: "comm_dryer", name: "烘手機", url: `${BASE}/lcb/Ipro_3` },
      { slug: "comm_drain", name: "落水頭", url: `${BASE}/lcb/Ipro_4` },
      { slug: "comm_acc", name: "公共配件", url: `${BASE}/lcb/Ipro_5` },
    ]},
  ];

  for (const cat of productCategories) {
    await prisma.productCategory.create({
      data: {
        slug: cat.slug,
        name: cat.name,
        emoji: cat.emoji,
        intent: cat.intent,
        url: cat.url,
        order: cat.order,
        subcategories: {
          create: cat.subs.map((s, i) => ({ slug: s.slug, name: s.name, url: s.url, order: i })),
        },
      },
    });
  }

  console.log("✅ Seed 完成：6地區、10門市、8自動回覆、1管理員、5系統設定、9產品分類");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
