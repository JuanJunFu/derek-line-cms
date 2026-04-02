import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";

type RegionMenuMode = "purchase" | "repair";

async function buildRegionMenuBase(mode: RegionMenuMode) {
  const [regions, title] = await Promise.all([
    prisma.region.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
    getSetting("region_menu_title"),
  ]);

  const isRepair = mode === "repair";
  const actionPrefix = isRepair ? "SELECT_REGION_REPAIR" : "SELECT_REGION";

  const rows: object[] = [];
  for (let i = 0; i < regions.length; i += 2) {
    const left = regions[i];
    const right = regions[i + 1];

    const rowContents: object[] = [
      {
        type: "button",
        style: "secondary",
        height: "sm",
        action: {
          type: "postback",
          label: left.name,
          data: `action=${actionPrefix}&slug=${left.slug}`,
          displayText: left.name,
        },
        flex: 1,
      },
    ];

    if (right) {
      rowContents.push({
        type: "button",
        style: "secondary",
        height: "sm",
        action: {
          type: "postback",
          label: right.name,
          data: `action=${actionPrefix}&slug=${right.slug}`,
          displayText: right.name,
        },
        flex: 1,
      });
    } else {
      rowContents.push({ type: "filler" });
    }

    rows.push({
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: rowContents,
    });
  }

  return {
    type: "flex" as const,
    altText: isRepair ? "請選擇維修服務地區" : "請選擇您所在的地區",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          // Mode badge
          isRepair
            ? {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "🔧 維修預約",
                    size: "xs",
                    color: "#ffffff",
                    weight: "bold",
                  },
                ],
                backgroundColor: "#E67E22",
                cornerRadius: "sm",
                paddingAll: "4px",
                paddingStart: "10px",
                paddingEnd: "10px",
              }
            : {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "🛒 採購諮詢",
                    size: "xs",
                    color: "#ffffff",
                    weight: "bold",
                  },
                ],
                backgroundColor: "#1B4F8C",
                cornerRadius: "sm",
                paddingAll: "4px",
                paddingStart: "10px",
                paddingEnd: "10px",
              },
          {
            type: "text",
            text: isRepair ? "請選擇維修服務地區" : "請選擇您所在的服務地區",
            weight: "bold",
            size: "md",
            margin: "sm",
          },
          {
            type: "text",
            text: isRepair
              ? "選擇地區後將顯示門市聯繫方式 🔧"
              : "我們將為您找到最近的服務據點 📍",
            size: "sm",
            color: "#888888",
            margin: "sm",
          },
          { type: "separator", margin: "lg" },
          {
            type: "text",
            text: "▼ 請選擇地區",
            size: "sm",
            color: "#666666",
            align: "center",
            margin: "lg",
          },
          ...rows,
        ],
      },
    },
  };
}

export async function buildRegionMenu() {
  return buildRegionMenuBase("purchase");
}

export async function buildRegionMenuRepair() {
  return buildRegionMenuBase("repair");
}
