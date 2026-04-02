/**
 * Area Managers Contact Carousel
 * Triggered when user taps the DEREK banner in Rich Menu.
 * Manager list and messages are managed via CMS Settings (後台設定).
 */
import { getSettings } from "@/lib/settings";

interface AreaManager {
  label: string;
  area: string;
  lineUri: string;
}

const DEFAULT_MANAGERS: AreaManager[] = [
  { label: "北區負責人", area: "台北 / 新北", lineUri: "https://line.me/ti/p/yuVxQMJgM0" },
  { label: "新竹負責人", area: "新竹",        lineUri: "https://line.me/ti/p/45qv_saITI" },
  { label: "台中負責人", area: "台中",        lineUri: "https://line.me/ti/p/PcMG5PT2a-" },
  { label: "台南負責人", area: "台南",        lineUri: "https://line.me/ti/p/VQ1Qd3eY4Q" },
  { label: "高雄負責人", area: "高雄",        lineUri: "https://lin.ee/mwJ2Mdi" },
];

function buildManagerCard(manager: AreaManager, lineShareUrl: string) {
  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
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
        {
          type: "text",
          text: manager.area,
          size: "xs",
          color: "#8A9BA8",
          margin: "sm",
        },
        {
          type: "text",
          text: manager.label,
          weight: "bold",
          size: "lg",
          margin: "xs",
        },
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
            uri: lineShareUrl,
          },
        },
      ],
      paddingAll: "12px",
    },
  };
}

export async function buildStoresFriendsCarousel() {
  const cfg = await getSettings(["area_managers", "repair_line_message"]);

  // Parse manager list from settings (fallback to hardcoded defaults)
  let managers: AreaManager[] = DEFAULT_MANAGERS;
  if (cfg.area_managers) {
    try {
      const parsed = JSON.parse(cfg.area_managers);
      if (Array.isArray(parsed) && parsed.length > 0) {
        managers = parsed;
      }
    } catch {
      // JSON parse error → use defaults
    }
  }

  const repairMsg = cfg.repair_line_message ||
    "您好，我透過DEREK官方帳號找到您，想預約採購或維修服務，請問方便協助嗎？";
  const lineShareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(repairMsg)}`;

  return {
    type: "flex" as const,
    altText: "全台區域負責人 LINE 好友",
    contents: {
      type: "carousel",
      contents: managers.map((m) => buildManagerCard(m, lineShareUrl)),
    },
  };
}
