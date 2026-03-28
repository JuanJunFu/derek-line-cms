import type { Store, Region } from "@prisma/client";

/**
 * Store card Flex Message — matching gold.html design
 * - Flagship/Branch: hero image area + full info + 2 buttons
 * - Dealer/General: compact single-line format + 2 buttons
 */

const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  FLAGSHIP: { label: "旗艦門市", bg: "#1a1a1a", color: "#B89A6A" },
  BRANCH: { label: "分公司", bg: "#2B4C7E", color: "#ffffff" },
  DEALER: { label: "授權經銷商", bg: "#9E9E9E", color: "#ffffff" },
  GENERAL: { label: "總經銷", bg: "#4E7C5F", color: "#ffffff" },
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
  // Use direct URI actions — one tap to open (no postback round-trip).
  // Tracking is already captured by STORE_VIEW when the carousel is shown.
  const footerContents: object[] = [];

  if (hasPhone) {
    footerContents.push({
      type: "button",
      style: "primary",
      color: "#1a1a1a",
      height: "sm",
      action: {
        type: "uri",
        label: isMainStore ? "📞 立即致電" : "📞 致電",
        uri: "tel:" + cleanPhone,
      },
    });
  }

  if (store.lineId) {
    footerContents.push({
      type: "button",
      style: "primary",
      color: "#06C755",
      height: "sm",
      action: {
        type: "uri",
        label: "💬 門市LINE",
        uri: "https://line.me/R/ti/p/" + store.lineId,
      },
    });
  } else if (store.googleMapUrl || hasAddress) {
    const mapUrl = store.googleMapUrl || ("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(store.address));
    footerContents.push({
      type: "button",
      style: "primary",
      color: "#06C755",
      height: "sm",
      action: {
        type: "uri",
        label: "📍 導航前往",
        uri: mapUrl,
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
