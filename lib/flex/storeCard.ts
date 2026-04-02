import type { Store, Region } from "@prisma/client";

/**
 * Store card Flex Message — matching gold.html design
 * - Flagship/Branch: hero image area + full info + 2 buttons
 * - Dealer/General: compact single-line format + 2 buttons
 */

const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  FLAGSHIP: { label: "旗艦門市", bg: "#1B4F8C", color: "#E8D5B0" }, // Classic Blue + Cornhusk
  BRANCH: { label: "分公司", bg: "#5A85B0", color: "#ffffff" },     // Provence Blue
  DEALER: { label: "授權經銷商", bg: "#8A9BA8", color: "#ffffff" }, // Monument Gray
  GENERAL: { label: "總經銷", bg: "#4E7C5F", color: "#ffffff" },   // Green (keep)
};

function buildStoreCard(store: Store & { region: Region }): Record<string, any> {
  const cfg = TYPE_CONFIG[store.type] ?? TYPE_CONFIG.DEALER;
  const cleanPhone = store.phone.replace(/[^0-9]/g, "");
  const hasPhone = cleanPhone.length >= 8;
  const hasAddress = store.address && store.address !== "待補";
  const isMainStore = store.type === "FLAGSHIP" || store.type === "BRANCH";

  // ── Body ──
  const bodyContents: object[] = [
    // Type badge
    {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: cfg.label,
          size: "xxs",
          color: cfg.color,
          weight: "bold",
        },
      ],
      backgroundColor: cfg.bg,
      cornerRadius: "sm",
      paddingAll: "3px",
      paddingStart: "8px",
      paddingEnd: "8px",
    },
    // Store name
    {
      type: "text",
      text: store.name,
      weight: "bold",
      size: isMainStore ? "lg" : "md",
      margin: "md",
    },
  ];

  if (isMainStore) {
    // Flagship/Branch: full detail format (matching gold.html Phone 3 left card)
    if (hasAddress) {
      bodyContents.push({
        type: "text",
        text: "📍 " + store.address,
        size: "sm",
        color: "#666666",
        wrap: true,
        margin: "md",
      });
    }
    if (hasPhone) {
      bodyContents.push({
        type: "text",
        text: "📞 " + store.phone,
        size: "sm",
        color: "#666666",
        margin: "sm",
      });
    }
    if (store.fax) {
      bodyContents.push({
        type: "text",
        text: "📠 傳真 " + store.fax,
        size: "xs",
        color: "#888888",
        margin: "sm",
      });
    }
    if (store.hours && store.hours !== "待補") {
      bodyContents.push({
        type: "text",
        text: "🕐 " + store.hours,
        size: "xs",
        color: "#888888",
        margin: "sm",
        wrap: true,
      });
    }
  } else {
    // Dealer/General: compact one-line format (matching gold.html "冠衛企業" card)
    const infoParts: string[] = [];
    if (hasAddress) infoParts.push("📍 " + store.address);
    if (hasPhone) infoParts.push("📞 " + store.phone);

    if (infoParts.length > 0) {
      bodyContents.push({
        type: "text",
        text: infoParts.join("  ｜  "),
        size: "xs",
        color: "#666666",
        wrap: true,
        margin: "md",
      });
    }
  }

  // ── Footer buttons (gold.html: dark "致電" + green "LINE/導航") ──
  // URI actions with tracking redirect — one tap opens target AND records the click.
  // Flow: LINE opens our /api/v1/track/redirect → server logs event → 302 to target.
  const baseUrl = process.env.NEXTAUTH_URL || "https://drweber.uk";
  const footerContents: object[] = [];

  if (hasPhone) {
    const trackUrl = `${baseUrl}/api/v1/track/redirect?action=STORE_CALL&storeId=${store.id}&uri=${encodeURIComponent("tel:" + cleanPhone)}`;
    footerContents.push({
      type: "button",
      style: "primary",
      color: "#1B4F8C",
      height: "sm",
      action: {
        type: "uri",
        label: isMainStore ? "📞 立即致電" : "📞 致電",
        uri: trackUrl,
      },
    });
  }

  if (store.lineId) {
    // lineId stores the full URL (e.g. https://line.me/ti/p/xxx or https://lin.ee/xxx)
    const lineUri = store.lineId.startsWith("http") ? store.lineId : "https://line.me/ti/p/" + store.lineId;
    const trackUrl = `${baseUrl}/api/v1/track/redirect?action=STORE_LINE&storeId=${store.id}&uri=${encodeURIComponent(lineUri)}`;
    footerContents.push({
      type: "button",
      style: "primary",
      color: "#06C755",
      height: "sm",
      action: {
        type: "uri",
        label: "💬 門市LINE",
        uri: trackUrl,
      },
    });
  } else if (store.googleMapUrl || hasAddress) {
    const mapUrl = store.googleMapUrl || ("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(store.address));
    const trackUrl = `${baseUrl}/api/v1/track/redirect?action=STORE_NAV&storeId=${store.id}&uri=${encodeURIComponent(mapUrl)}`;
    footerContents.push({
      type: "button",
      style: "primary",
      color: "#06C755",
      height: "sm",
      action: {
        type: "uri",
        label: "📍 導航前往",
        uri: trackUrl,
      },
    });
  }

  // Must have at least 1 button
  if (footerContents.length === 0) {
    footerContents.push({
      type: "button",
      style: "primary",
      color: "#1a1a1a",
      height: "sm",
      action: {
        type: "uri",
        label: "🌐 品牌官網",
        uri: "https://www.lcb.com.tw",
      },
    });
  }

  // ── Bubble ──
  const bubble: Record<string, any> = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: bodyContents,
      paddingAll: "16px",
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: footerContents,
      paddingAll: "12px",
    },
  };

  // Hero image for flagship/branch (matching gold.html gradient placeholder)
  if (isMainStore) {
    if (store.imageUrl) {
      bubble.hero = {
        type: "image",
        url: store.imageUrl,
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover",
      };
    } else {
      // Gradient placeholder like gold.html "台南旗艦店 門市實景"
      bubble.hero = {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: store.name + " 門市實景",
            color: "#B89A6A",
            size: "xs",
            align: "center",
            offsetTop: "30px",
          },
        ],
        background: {
          type: "linearGradient",
          angle: "135deg",
          startColor: "#2a2a2a",
          endColor: "#111111",
        },
        height: "100px",
        justifyContent: "center",
      };
    }
  }

  return bubble;
}

export function buildStoreCarousel(stores: (Store & { region: Region })[]) {
  return {
    type: "flex",
    altText: `找到 ${stores.length} 間服務據點`,
    contents: {
      type: "carousel",
      contents: stores.map(buildStoreCard),
    },
  };
}
