/**
 * Purpose selection menu — shown when user taps 「門市 & 維修」in Rich Menu
 * Two choices: 採購諮詢 or 維修預約
 */
export function buildPurposeMenu() {
  return {
    type: "flex" as const,
    altText: "請選擇服務類型",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        spacing: "md",
        contents: [
          // Header icon row
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "DEREK 德瑞克衛浴",
                size: "xs",
                color: "#8A9BA8",
                weight: "bold",
              },
            ],
          },
          // Title
          {
            type: "text",
            text: "請問您需要哪種服務？",
            weight: "bold",
            size: "lg",
            margin: "sm",
          },
          {
            type: "text",
            text: "選擇後將為您導引至附近據點",
            size: "sm",
            color: "#888888",
          },
          { type: "separator", margin: "lg" },
          // 採購 button
          {
            type: "button",
            style: "primary",
            color: "#1B4F8C",
            margin: "lg",
            height: "sm",
            action: {
              type: "postback",
              label: "🛒  採購諮詢  —  找服務據點",
              data: "action=SHOW_REGION_MENU",
              displayText: "採購諮詢",
            },
          },
          // 維修 button
          {
            type: "button",
            style: "primary",
            color: "#E67E22",
            margin: "sm",
            height: "sm",
            action: {
              type: "postback",
              label: "🔧  維修預約  —  聯繫門市",
              data: "action=SHOW_REGION_REPAIR",
              displayText: "維修預約",
            },
          },
          // Hint
          {
            type: "text",
            text: "維修需先加入門市LINE好友",
            size: "xxs",
            color: "#AAAAAA",
            align: "center",
            margin: "sm",
          },
        ],
      },
    },
  };
}
