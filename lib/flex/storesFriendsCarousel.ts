/**
 * Area Managers Contact Carousel
 * Triggered when user taps the DEREK banner in Rich Menu
 * Shows 5 hardcoded area manager cards (person-centric, not store-centric)
 */

const REPAIR_TEXT = encodeURIComponent(
  "您好，我透過DEREK官方帳號找到您，想預約採購或維修服務，請問方便協助嗎？"
);
const LINE_SHARE_URL = `https://line.me/R/msg/text/?${REPAIR_TEXT}`;

interface AreaManager {
  label: string;  // e.g. "北區負責人"
  area: string;   // display area name
  lineUri: string;
}

const AREA_MANAGERS: AreaManager[] = [
  {
    label: "北區負責人",
    area: "台北 / 新北",
    lineUri: "https://line.me/ti/p/yuVxQMJgM0",
  },
  {
    label: "新竹負責人",
    area: "新竹",
    lineUri: "https://line.me/ti/p/45qv_saITI",
  },
  {
    label: "台中負責人",
    area: "台中",
    lineUri: "https://line.me/ti/p/PcMG5PT2a-",
  },
  {
    label: "台南負責人",
    area: "台南",
    lineUri: "https://line.me/ti/p/VQ1Qd3eY4Q",
  },
  {
    label: "高雄負責人",
    area: "高雄",
    lineUri: "https://lin.ee/mwJ2Mdi",
  },
];

function buildManagerCard(manager: AreaManager) {
  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        // Badge
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: "DEREK 服務聯絡",
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
        // Area
        {
          type: "text",
          text: manager.area,
          size: "xs",
          color: "#8A9BA8",
          margin: "sm",
        },
        // Label
        {
          type: "text",
          text: manager.label,
          weight: "bold",
          size: "lg",
          margin: "xs",
        },
        // Description
        {
          type: "text",
          text: "採購諮詢・維修服務",
          size: "xs",
          color: "#888888",
          margin: "sm",
        },
      ],
      paddingAll: "16px",
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "none",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#1B4F8C",
          height: "sm",
          action: {
            type: "uri",
            label: "＋ 加入LINE好友",
            uri: manager.lineUri,
          },
        },
        {
          type: "button",
          style: "primary",
          color: "#E67E22",
          height: "sm",
          margin: "sm",
          action: {
            type: "uri",
            label: "💬 發送諮詢訊息",
            uri: LINE_SHARE_URL,
          },
        },
      ],
      paddingAll: "12px",
    },
  };
}

export async function buildStoresFriendsCarousel() {
  return {
    type: "flex" as const,
    altText: "全台區域負責人 LINE 好友",
    contents: {
      type: "carousel",
      contents: AREA_MANAGERS.map(buildManagerCard),
    },
  };
}
