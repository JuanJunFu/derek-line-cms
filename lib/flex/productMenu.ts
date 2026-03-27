/**
 * Product Category Menu — LINE Flex Message
 * Two-level: Main categories → Subcategories
 * All clicks are Postback (trackable), subcategories link to lcb.com.tw
 *
 * Reads from DB (ProductCategory + ProductSubcategory).
 * Falls back to hardcoded data if DB is empty.
 */

import { prisma } from "@/lib/prisma";
import productsData from "@/data/products.json";

const BASE = "https://www.lcb.com.tw";

type CategoryData = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  intent: string;
  url: string;
  subs: { slug: string; name: string; url: string }[];
};

// Hardcoded fallback (used only if DB has no categories)
const FALLBACK_CATEGORIES: CategoryData[] = [
  { id: "toilet", slug: "toilet", name: "馬桶", emoji: "🚽", intent: "Comfort_High", url: `${BASE}/lcb/Apro`, subs: [
    { slug: "toilet_smart", name: "智慧馬桶", url: `${BASE}/lcb/Apro_1` },
    { slug: "toilet_one", name: "單體馬桶", url: `${BASE}/lcb/Apro_2` },
    { slug: "toilet_two", name: "分體馬桶", url: `${BASE}/lcb/Apro_3` },
    { slug: "toilet_child", name: "幼兒馬桶", url: `${BASE}/lcb/Apro_4` },
    { slug: "toilet_squat", name: "蹲式馬桶", url: `${BASE}/lcb/Apro_5` },
  ]},
  { id: "bidet", slug: "bidet", name: "免治馬桶座", emoji: "💺", intent: "Comfort_High", url: `${BASE}/lcb/Bpro`, subs: [
    { slug: "bidet_luxury", name: "奢華系列", url: `${BASE}/lcb/Bpro_1` },
    { slug: "bidet_urban", name: "都會系列", url: `${BASE}/lcb/Bpro_2` },
  ]},
  { id: "basin", slug: "basin", name: "面盆/浴櫃", emoji: "🪥", intent: "Storage_Space", url: `${BASE}/lcb/Cpro`, subs: [
    { slug: "basin_under", name: "下嵌盆", url: `${BASE}/lcb/Cpro_2` },
    { slug: "basin_top", name: "典雅檯上盆", url: `${BASE}/lcb/Cpro_1` },
    { slug: "basin_one", name: "時尚一體盆", url: `${BASE}/lcb/Cpro_3` },
    { slug: "basin_small", name: "小空間面盆", url: `${BASE}/lcb/Cpro_4` },
    { slug: "basin_wall", name: "經典壁掛盆", url: `${BASE}/lcb/Cpro_5` },
  ]},
  { id: "faucet", slug: "faucet", name: "浴室龍頭", emoji: "🚿", intent: "Quick_Fix", url: `${BASE}/lcb/Dpro`, subs: [
    { slug: "faucet_basin", name: "面盆龍頭", url: `${BASE}/lcb/Dpro_1` },
    { slug: "faucet_shower", name: "沐浴龍頭", url: `${BASE}/lcb/Dpro_2` },
    { slug: "faucet_steel", name: "不鏽鋼龍頭", url: `${BASE}/lcb/Dpro_3` },
    { slug: "faucet_sensor", name: "感應龍頭", url: `${BASE}/lcb/Dpro_4` },
    { slug: "faucet_leadfree", name: "無鉛龍頭", url: `${BASE}/lcb/Dpro_5` },
    { slug: "faucet_tub", name: "浴缸龍頭", url: `${BASE}/lcb/Dpro_6` },
    { slug: "faucet_rain", name: "花灑龍頭", url: `${BASE}/lcb/Dpro_7` },
    { slug: "faucet_hand", name: "手持蓮蓬頭", url: `${BASE}/lcb/Dpro_8` },
  ]},
  { id: "accessibility", slug: "accessibility", name: "無障礙設備", emoji: "♿", intent: "Safety_Care", url: `${BASE}/lcb/Epro`, subs: [] },
  { id: "bathtub", slug: "bathtub", name: "浴缸", emoji: "🛁", intent: "Luxury_Living", url: `${BASE}/lcb/Fpro`, subs: [
    { slug: "tub_free", name: "獨立浴缸", url: `${BASE}/lcb/Fpro_1` },
    { slug: "tub_built", name: "嵌入式浴缸", url: `${BASE}/lcb/Fpro_2` },
  ]},
  { id: "accessories", slug: "accessories", name: "浴室配件", emoji: "🔧", intent: "Maintenance", url: `${BASE}/lcb/Gpro`, subs: [
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
  { id: "urinal", slug: "urinal", name: "小便斗", emoji: "🚹", intent: "Luxury_Living", url: `${BASE}/lcb/Hpro`, subs: [
    { slug: "urinal_wall", name: "壁掛式便斗", url: `${BASE}/lcb/Hpro_1` },
    { slug: "urinal_floor", name: "落地式便斗", url: `${BASE}/lcb/Hpro_2` },
    { slug: "urinal_child", name: "幼兒便斗", url: `${BASE}/lcb/Hpro_3` },
  ]},
  { id: "commercial", slug: "commercial", name: "公共空間", emoji: "🏢", intent: "Maintenance", url: `${BASE}/lcb/Ipro`, subs: [
    { slug: "comm_kitchen", name: "廚房龍頭", url: `${BASE}/lcb/Ipro_1` },
    { slug: "comm_wall", name: "壁式龍頭", url: `${BASE}/lcb/Ipro_2` },
    { slug: "comm_dryer", name: "烘手機", url: `${BASE}/lcb/Ipro_3` },
    { slug: "comm_drain", name: "落水頭", url: `${BASE}/lcb/Ipro_4` },
    { slug: "comm_acc", name: "公共配件", url: `${BASE}/lcb/Ipro_5` },
  ]},
];

/** Load categories from DB, fallback to hardcoded */
async function getCategories(): Promise<CategoryData[]> {
  try {
    const dbCats = await prisma.productCategory.findMany({
      where: { isActive: true },
      include: { subcategories: { orderBy: { order: "asc" } } },
      orderBy: { order: "asc" },
    });

    if (dbCats.length > 0) {
      return dbCats.map((c) => ({
        id: c.slug,
        slug: c.slug,
        name: c.name,
        emoji: c.emoji,
        intent: c.intent,
        url: c.url,
        subs: c.subcategories.map((s) => ({
          slug: s.slug,
          name: s.name,
          url: s.url,
        })),
      }));
    }
  } catch {
    // DB not available — use fallback
  }
  return FALLBACK_CATEGORIES;
}

/** Find a category by slug (for postback replies) */
async function findCategory(slug: string): Promise<CategoryData | undefined> {
  const cats = await getCategories();
  return cats.find((c) => c.id === slug || c.slug === slug);
}

/**
 * Build the main product category menu (Level 1).
 * Each category is a Postback button.
 */
export async function buildProductMenu() {
  const categories = await getCategories();

  const buttons = categories.map((cat) => ({
    type: "button" as const,
    style: "secondary" as const,
    height: "sm" as const,
    action: {
      type: "postback" as const,
      label: `${cat.emoji} ${cat.name}`,
      data: `action=PRODUCT_VIEW&category=${cat.slug}`,
      displayText: cat.name,
    },
  }));

  // 2-column rows
  const rows: object[] = [];
  for (let i = 0; i < buttons.length; i += 2) {
    const items: object[] = [{ ...buttons[i], flex: 1 }];
    if (buttons[i + 1]) items.push({ ...buttons[i + 1], flex: 1 });
    else items.push({ type: "filler" });
    rows.push({
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: items,
    });
  }

  return {
    type: "flex" as const,
    altText: "產品分類選單",
    contents: {
      type: "bubble" as const,
      body: {
        type: "box" as const,
        layout: "vertical" as const,
        spacing: "md" as const,
        paddingAll: "16px",
        contents: [
          { type: "text", text: "請選擇感興趣的產品分類", weight: "bold", size: "md" },
          { type: "text", text: "點擊後查看細分類別", size: "sm", color: "#888888", margin: "sm" },
          { type: "separator", margin: "lg" },
          ...rows,
        ],
      },
    },
  };
}

/**
 * Build subcategory reply for a given category slug.
 */
export async function buildProductReply(categorySlug: string) {
  const cat = await findCategory(categorySlug);
  if (!cat) return null;

  // No subcategories → direct link
  if (cat.subs.length === 0) {
    return {
      type: "flex" as const,
      altText: `${cat.name} - 前往官網`,
      contents: {
        type: "bubble" as const,
        body: {
          type: "box" as const,
          layout: "vertical" as const,
          paddingAll: "16px",
          contents: [
            { type: "text", text: `${cat.emoji} ${cat.name}`, weight: "bold", size: "lg" },
            { type: "text", text: "點擊下方按鈕前往官網查看完整產品資訊", size: "sm", color: "#888888", margin: "md", wrap: true },
          ],
        },
        footer: {
          type: "box" as const,
          layout: "vertical" as const,
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#B89A6A",
              action: { type: "uri" as const, label: "前往官網查看", uri: cat.url },
            },
          ],
        },
      },
    };
  }

  // Has subcategories → show sub buttons as URI actions
  const subButtons = cat.subs.map((sub) => ({
    type: "button" as const,
    style: "secondary" as const,
    height: "sm" as const,
    action: {
      type: "uri" as const,
      label: sub.name,
      uri: sub.url,
    },
  }));

  const rows: object[] = [];
  for (let i = 0; i < subButtons.length; i += 2) {
    const items: object[] = [{ ...subButtons[i], flex: 1 }];
    if (subButtons[i + 1]) items.push({ ...subButtons[i + 1], flex: 1 });
    else items.push({ type: "filler" });
    rows.push({
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: items,
    });
  }

  return {
    type: "flex" as const,
    altText: `${cat.name} - 細分類別`,
    contents: {
      type: "bubble" as const,
      body: {
        type: "box" as const,
        layout: "vertical" as const,
        spacing: "sm" as const,
        paddingAll: "16px",
        contents: [
          { type: "text", text: `${cat.emoji} ${cat.name}`, weight: "bold", size: "lg" },
          { type: "text", text: "請選擇細分類別，前往官網查看", size: "sm", color: "#888888", margin: "sm", wrap: true },
          { type: "separator", margin: "md" },
          ...rows,
        ],
      },
      footer: {
        type: "box" as const,
        layout: "vertical" as const,
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#B89A6A",
            action: { type: "uri" as const, label: `查看全部${cat.name}`, uri: cat.url },
          },
        ],
      },
    },
  };
}

/**
 * Build Intelligence Series menu — 5 smart toilet series as a Flex Carousel.
 */
export function buildIntelligenceSeriesMenu() {
  const INTEL_URL = `${BASE}/lcb/IntelligenceTechnology`;

  const bubbles = productsData.intelligenceSeries.map((series) => ({
    type: "bubble" as const,
    size: "kilo" as const,
    header: {
      type: "box" as const,
      layout: "vertical" as const,
      paddingAll: "12px",
      backgroundColor: "#1a1a2e",
      contents: [
        { type: "text", text: "智慧科技", size: "xs", color: "#B89A6A" },
        { type: "text", text: series.label, size: "lg", weight: "bold" as const, color: "#ffffff" },
        { type: "text", text: series.subtitle, size: "xs", color: "#aaaaaa", margin: "xs" },
      ],
    },
    body: {
      type: "box" as const,
      layout: "vertical" as const,
      paddingAll: "12px",
      spacing: "xs" as const,
      contents: series.features.map((f) => ({
        type: "box" as const,
        layout: "horizontal" as const,
        contents: [
          { type: "text", text: "✓", size: "xs", color: "#B89A6A", flex: 0 },
          { type: "text", text: f, size: "xs", color: "#555555", flex: 1, margin: "sm" as const, wrap: true },
        ],
      })),
    },
    footer: {
      type: "box" as const,
      layout: "vertical" as const,
      paddingAll: "8px",
      contents: [
        {
          type: "button",
          style: "primary" as const,
          height: "sm" as const,
          color: "#B89A6A",
          action: {
            type: "postback" as const,
            label: "了解更多",
            data: `action=PRODUCT_VIEW&category=toilet_smart&series=${series.id}`,
            displayText: `想了解 ${series.label} 系列`,
          },
        },
      ],
    },
  }));

  return {
    type: "flex" as const,
    altText: "DEREK 智慧科技系列",
    contents: {
      type: "carousel" as const,
      contents: [
        ...bubbles,
        {
          type: "bubble" as const,
          size: "kilo" as const,
          header: {
            type: "box" as const,
            layout: "vertical" as const,
            paddingAll: "12px",
            backgroundColor: "#B89A6A",
            contents: [
              { type: "text", text: "DEREK 智慧衛浴", size: "sm", weight: "bold" as const, color: "#ffffff" },
              { type: "text", text: "查看完整智慧科技系列", size: "xs", color: "#ffffff", margin: "xs" },
            ],
          },
          body: {
            type: "box" as const,
            layout: "vertical" as const,
            paddingAll: "12px",
            contents: [
              { type: "text", text: "探索更多智慧衛浴解決方案", size: "xs", color: "#555555", wrap: true },
            ],
          },
          footer: {
            type: "box" as const,
            layout: "vertical" as const,
            paddingAll: "8px",
            contents: [
              {
                type: "button",
                style: "primary" as const,
                height: "sm" as const,
                color: "#1a1a2e",
                action: {
                  type: "uri" as const,
                  label: "前往官網",
                  uri: INTEL_URL,
                },
              },
            ],
          },
        },
      ],
    },
  };
}
