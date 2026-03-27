import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";

export async function buildRegionMenu() {
  const [regions, title] = await Promise.all([
    prisma.region.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
    getSetting("region_menu_title"),
  ]);

  const menuTitle = title || "📍 請選擇您所在的地區";

  // Build 2-column grid rows (matching gold.html layout)
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
          data: `action=SELECT_REGION&slug=${left.slug}`,
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
          data: `action=SELECT_REGION&slug=${right.slug}`,
          displayText: right.name,
        },
        flex: 1,
      });
    } else {
      // Empty spacer for odd count
      rowContents.push({
        type: "filler",
      });
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
    altText: "請選擇您所在的地區",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "請選擇您所在的服務地區",
            weight: "bold",
            size: "md",
          },
          {
            type: "text",
            text: "我們將為您找到最近的服務據點 📍",
            size: "sm",
            color: "#888888",
            margin: "sm",
          },
          {
            type: "separator",
            margin: "lg",
          },
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
