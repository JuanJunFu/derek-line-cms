/**
 * All Stores Friends Carousel
 * Triggered when user taps the DEREK banner in Rich Menu
 * Shows all flagship/branch stores with "Add Friend" + "Send Repair Message" buttons
 */
import type { Store, Region } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TYPE_LABEL: Record<string, string> = {
  FLAGSHIP: "旗艦門市",
  BRANCH: "分公司",
  GENERAL: "總經銷",
  DEALER: "授權經銷商",
};

const REPAIR_TEXT = encodeURIComponent(
  "您好，我透過DEREK官方帳號找到您，想預約維修服務，請問方便協助嗎？"
);
const LINE_SHARE_URL = `https://line.me/R/msg/text/?${REPAIR_TEXT}`;

function buildFriendCard(store: Store & { region: Region }) {
  const lineUri = store.lineId
    ? store.lineId.startsWith("http")
      ? store.lineId
      : "https://line.me/ti/p/" + store.lineId
    : null;

  const typeLabel = TYPE_LABEL[store.type] ?? store.type;

  const bodyContents: object[] = [
    // Badge
    {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: typeLabel,
          size: "xxs",
          color: "#E8D5B0",
          weight: "bold",
        },
      ],
      backgroundColor: "#1B4F8C",
      cornerRadius: "sm",
      paddingAll: "3px",
      paddingStart: "8px",
      paddingEnd: "8px",
    },
    // Region
    {
      type: "text",
      text: store.region.name,
      size: "xs",
      color: "#8A9BA8",
      margin: "sm",
    },
    // Name
    {
      type: "text",
      text: store.name,
      weight: "bold",
      size: "md",
      margin: "xs",
    },
  ];

  if (store.address && store.address !== "待補") {
    bodyContents.push({
      type: "text",
      text: "📍 " + store.address,
      size: "xs",
      color: "#666666",
      wrap: true,
      margin: "sm",
    });
  }

  const footerContents: object[] = [];

  if (lineUri) {
    // Button 1: Add friend / open chat
    footerContents.push({
      type: "button",
      style: "primary",
      color: "#1B4F8C",
      height: "sm",
      action: {
        type: "uri",
        label: "＋ 加入LINE好友",
        uri: lineUri,
      },
    });

    // Button 2: Send pre-filled repair message
    footerContents.push({
      type: "button",
      style: "primary",
      color: "#E67E22",
      height: "sm",
      margin: "sm",
      action: {
        type: "uri",
        label: "🔧 發送維修訊息",
        uri: LINE_SHARE_URL,
      },
    });
  } else if (store.phone && store.phone !== "待補") {
    const cleanPhone = store.phone.replace(/[^0-9]/g, "");
    footerContents.push({
      type: "button",
      style: "primary",
      color: "#1B4F8C",
      height: "sm",
      action: {
        type: "uri",
        label: "📞 致電門市",
        uri: "tel:" + cleanPhone,
      },
    });
  }

  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: bodyContents,
      paddingAll: "16px",
    },
    footer: footerContents.length > 0
      ? {
          type: "box",
          layout: "vertical",
          spacing: "none",
          contents: footerContents,
          paddingAll: "12px",
        }
      : undefined,
  };
}

export async function buildStoresFriendsCarousel() {
  // Only show flagship + branch + general — stores that have LINE contacts
  const stores = await prisma.store.findMany({
    where: {
      isActive: true,
      type: { in: ["FLAGSHIP", "BRANCH", "GENERAL"] },
    },
    include: { region: true },
    orderBy: [{ region: { order: "asc" } }, { order: "asc" }],
  });

  if (stores.length === 0) {
    return null;
  }

  return {
    type: "flex" as const,
    altText: "全台門市LINE好友",
    contents: {
      type: "carousel",
      contents: stores.map(buildFriendCard),
    },
  };
}
