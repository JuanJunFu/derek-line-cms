import { NextRequest, NextResponse } from "next/server";
import type { WebhookEvent } from "@line/bot-sdk";
import { lineClient, verifyLineSignature } from "@/lib/line";
import { prisma } from "@/lib/prisma";
import { buildRegionMenu, buildRegionMenuRepair } from "@/lib/flex/regionMenu";
import { buildStoreCarousel, buildRepairStoreCarousel } from "@/lib/flex/storeCard";
import { buildProductMenu, buildProductReply } from "@/lib/flex/productMenu";
import { buildPurposeMenu } from "@/lib/flex/purposeMenu";
import { buildStoresFriendsCarousel } from "@/lib/flex/storesFriendsCarousel";
import { getAutoReply } from "@/lib/reply";
import { getSettings } from "@/lib/settings";
import { trackEvent } from "@/lib/tracking";
import { triggerNewCustomerSequence, triggerRepairSequence } from "@/lib/sequence";
import { REPAIR_KEYWORDS, REFERRAL_KEYWORDS, REFERRAL_CODE_PATTERN } from "@/lib/constants";
import { generateReferralCode, redeemReferralCode } from "@/lib/referral";
import { logChatMessage } from "@/lib/chatlog";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-line-signature");

    if (!signature || !verifyLineSignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const { events } = JSON.parse(body) as { events: WebhookEvent[] };

    await Promise.all(
      events.map((event, index) => handleEvent(event, index))
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}

async function handleEvent(event: WebhookEvent, eventIndex: number) {
  const cfg = await getSettings([
    "welcome_message",
    "fallback_message",
    "no_store_message",
    "store_intro_prefix",
    "friends_intro_message",
    "repair_store_intro",
    "repair_line_message",
  ]);

  // Generate a unique event ID for deduplication
  const webhookEventId =
    "webhookEventId" in event
      ? `${(event as any).webhookEventId}-${eventIndex}`
      : undefined;
  const userId =
    event.source && "userId" in event.source ? event.source.userId : undefined;

  try {
    // ── Follow event ──
    if (event.type === "follow") {
      if (userId) {
        await trackEvent(userId, "FOLLOW", {}, webhookEventId);
        // Trigger new customer sequence (non-blocking)
        triggerNewCustomerSequence(userId).catch((e) =>
          console.error("[sequence] Failed to trigger new customer sequence:", e)
        );
      }
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: "text", text: cfg.welcome_message }],
      });
      if (userId) {
        logChatMessage({
          userId,
          direction: "outbound",
          msgType: "text",
          content: { text: cfg.welcome_message },
        }).catch((e) => console.error("[chatlog] outbound welcome:", e));
      }
      return;
    }

    // ── Unfollow event ──
    if (event.type === "unfollow") {
      if (userId) {
        await trackEvent(userId, "UNFOLLOW", {}, webhookEventId);
      }
      return;
    }

    // ── Text message ──
    if (event.type === "message" && event.message.type === "text") {
      const text = event.message.text.trim();

      // Log inbound text message
      if (userId) {
        logChatMessage({
          userId,
          direction: "inbound",
          msgType: "text",
          content: { text },
        }).catch((e) => console.error("[chatlog] inbound text:", e));
      }

      // ── Referral: generate code → Flex card with share link ──
      if (userId && REFERRAL_KEYWORDS.some((kw) => text === kw)) {
        const result = await generateReferralCode(userId);
        await trackEvent(userId, "REFERRAL_GENERATE", { keyword: text }, webhookEventId);
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: result.flexMessage
            ? [result.flexMessage as any]
            : [{ type: "text", text: result.message }],
        });
        logChatMessage({
          userId,
          direction: "outbound",
          msgType: result.flexMessage ? "flex" : "text",
          content: result.flexMessage
            ? { altText: "推薦碼" }
            : { text: result.message },
        }).catch((e) => console.error("[chatlog] outbound referral gen:", e));
        return;
      }

      // ── Referral: redeem code ──
      if (userId && REFERRAL_CODE_PATTERN.test(text)) {
        const result = await redeemReferralCode(text, userId);
        const eventType = result.success ? "REFERRAL_COMPLETE" : "REFERRAL_FAIL";
        await trackEvent(userId, eventType, { keyword: text, referralCode: text }, webhookEventId);
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: result.message }],
        });
        logChatMessage({
          userId,
          direction: "outbound",
          msgType: "text",
          content: { text: result.message },
        }).catch((e) => console.error("[chatlog] outbound referral redeem:", e));
        return;
      }

      const reply = await getAutoReply(text);

      // Track message event
      if (userId) {
        if (reply.type === "text" || reply.type === "region_menu" || reply.type === "product_menu") {
          const eventType = reply.type === "text" && !reply.text ? "FALLBACK" : "MESSAGE";
          await trackEvent(userId, eventType, { keyword: text }, webhookEventId);

          // Trigger repair sequence if repair keywords detected
          if (eventType === "MESSAGE" && REPAIR_KEYWORDS.some((kw) => text.includes(kw))) {
            triggerRepairSequence(userId).catch((e) =>
              console.error("[sequence] Failed to trigger repair sequence:", e)
            );
          }
        }
      }

      if (reply.type === "region_menu") {
        const menu = await buildRegionMenu();
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [menu as any],
        });
        if (userId) {
          logChatMessage({
            userId,
            direction: "outbound",
            msgType: "flex",
            content: { altText: "地區選單" },
          }).catch((e) => console.error("[chatlog] outbound region menu:", e));
        }
      } else if (reply.type === "product_menu") {
        const menu = await buildProductMenu();
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [menu as any],
        });
        if (userId) {
          logChatMessage({
            userId,
            direction: "outbound",
            msgType: "flex",
            content: { altText: "產品選單" },
          }).catch((e) => console.error("[chatlog] outbound product menu:", e));
        }
      } else {
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: reply.text }],
        });
        if (userId) {
          logChatMessage({
            userId,
            direction: "outbound",
            msgType: "text",
            content: { text: reply.text },
          }).catch((e) => console.error("[chatlog] outbound text:", e));
        }
      }
      return;
    }

    // ── Postback ──
    if (event.type === "postback") {
      const params = new URLSearchParams(event.postback.data);
      const action = params.get("action");

      // Log inbound postback
      if (userId) {
        logChatMessage({
          userId,
          direction: "inbound",
          msgType: "postback",
          content: { data: event.postback.data, displayText: action ?? "" },
        }).catch((e) => console.error("[chatlog] inbound postback:", e));
      }

      // Generic Postback tracking (for sequence buttons)
      if (userId) {
        await trackEvent(
          userId,
          "POSTBACK",
          { postbackAction: action ?? "unknown" },
          webhookEventId
        );
      }

      // Sequence button: show product menu
      if (action === "SHOW_PRODUCT_MENU") {
        const menu = await buildProductMenu();
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [menu as any],
        });
        if (userId) {
          logChatMessage({
            userId,
            direction: "outbound",
            msgType: "flex",
            content: { altText: "產品選單" },
          }).catch((e) => console.error("[chatlog] outbound product menu pb:", e));
        }
        return;
      }

      // Sequence button: show region menu
      if (action === "SHOW_REGION_MENU") {
        const menu = await buildRegionMenu();
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [menu as any],
        });
        if (userId) {
          logChatMessage({
            userId,
            direction: "outbound",
            msgType: "flex",
            content: { altText: "地區選單" },
          }).catch((e) => console.error("[chatlog] outbound region menu pb:", e));
        }
        return;
      }

      // Region selection
      if (action === "SELECT_REGION") {
        const slug = params.get("slug")!;

        if (userId) {
          await trackEvent(
            userId,
            "REGION_SELECT",
            { region: slug },
            webhookEventId
          );
        }

        const stores = await prisma.store.findMany({
          where: { region: { slug }, isActive: true },
          include: { region: true },
          orderBy: { order: "asc" },
        });

        if (stores.length === 0) {
          await lineClient.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: cfg.no_store_message }],
          });
          if (userId) {
            logChatMessage({
              userId,
              direction: "outbound",
              msgType: "text",
              content: { text: cfg.no_store_message },
            }).catch((e) => console.error("[chatlog] outbound no store:", e));
          }
        } else {
          const regionName = stores[0].region.name;
          const introText = cfg.store_intro_prefix.replace(
            "{region}",
            regionName
          );
          const carousel = buildStoreCarousel(stores);

          // Track STORE_VIEW for each store shown
          if (userId) {
            for (const s of stores) {
              await trackEvent(userId, "STORE_VIEW", {
                storeId: s.id,
                storeName: s.name,
              });
            }
          }

          await lineClient.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: introText }, carousel as any],
          });
          if (userId) {
            logChatMessage({
              userId,
              direction: "outbound",
              msgType: "text",
              content: { text: introText },
            }).catch((e) => console.error("[chatlog] outbound store intro:", e));
            logChatMessage({
              userId,
              direction: "outbound",
              msgType: "flex",
              content: { altText: `${regionName} 門市` },
            }).catch((e) => console.error("[chatlog] outbound store carousel:", e));
          }
        }
        return;
      }

      // ── 採購 / 維修 目的選擇選單 ──
      if (action === "SHOW_PURPOSE_MENU") {
        const menu = buildPurposeMenu();
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [menu as any],
        });
        if (userId) {
          logChatMessage({
            userId,
            direction: "outbound",
            msgType: "flex",
            content: { altText: "採購或維修" },
          }).catch((e) => console.error("[chatlog] outbound purpose menu:", e));
        }
        return;
      }

      // ── 橫幅點擊：全台門市LINE好友名單 ──
      if (action === "SHOW_ALL_STORES_FRIENDS") {
        const carousel = await buildStoresFriendsCarousel();
        if (carousel) {
          await lineClient.replyMessage({
            replyToken: event.replyToken,
            messages: [
              { type: "text", text: cfg.friends_intro_message || "以下是全台各地區域負責人，加入好友後可直接諮詢採購或預約維修 👇" },
              carousel as any,
            ],
          });
          if (userId) {
            logChatMessage({
              userId,
              direction: "outbound",
              msgType: "flex",
              content: { altText: "全台門市LINE好友" },
            }).catch((e) => console.error("[chatlog] outbound stores friends:", e));
          }
        }
        return;
      }

      // ── 維修地區選單 ──
      if (action === "SHOW_REGION_REPAIR") {
        const menu = await buildRegionMenuRepair();
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [menu as any],
        });
        if (userId) {
          logChatMessage({
            userId,
            direction: "outbound",
            msgType: "flex",
            content: { altText: "維修地區選單" },
          }).catch((e) => console.error("[chatlog] outbound repair region menu:", e));
        }
        return;
      }

      // ── 維修門市卡片 ──
      if (action === "SELECT_REGION_REPAIR") {
        const slug = params.get("slug")!;

        if (userId) {
          await trackEvent(
            userId,
            "REGION_SELECT",
            { region: slug, mode: "repair" },
            webhookEventId
          );
        }

        const stores = await prisma.store.findMany({
          where: { region: { slug }, isActive: true },
          include: { region: true },
          orderBy: { order: "asc" },
        });

        if (stores.length === 0) {
          await lineClient.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: cfg.no_store_message }],
          });
        } else {
          const regionName = stores[0].region.name;
          const introTemplate = cfg.repair_store_intro ||
            "以下是 {region} 的維修服務據點，請依序：① 加好友 → ② 發送維修訊息 🔧";
          const introText = introTemplate.replace("{region}", regionName);
          const repairMsg = cfg.repair_line_message ||
            "您好，我透過DEREK官方帳號找到您，想預約採購或維修服務，請問方便協助嗎？";
          const carousel = buildRepairStoreCarousel(stores, repairMsg);

          if (userId) {
            for (const s of stores) {
              await trackEvent(userId, "STORE_VIEW", {
                storeId: s.id,
                storeName: s.name,
                mode: "repair",
              });
            }
          }

          await lineClient.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: introText }, carousel as any],
          });
          if (userId) {
            logChatMessage({
              userId,
              direction: "outbound",
              msgType: "flex",
              content: { altText: `${regionName} 維修門市` },
            }).catch((e) => console.error("[chatlog] outbound repair carousel:", e));
          }
        }
        return;
      }

      // Product view (two-step: record → reply with URI)
      if (action === "PRODUCT_VIEW") {
        const category = params.get("category")!;

        if (userId) {
          await trackEvent(
            userId,
            "PRODUCT_VIEW",
            { category },
            webhookEventId
          );
        }

        const reply = await buildProductReply(category);
        if (reply) {
          await lineClient.replyMessage({
            replyToken: event.replyToken,
            messages: [reply as any],
          });
          if (userId) {
            logChatMessage({
              userId,
              direction: "outbound",
              msgType: "flex",
              content: { altText: `產品：${category}` },
            }).catch((e) => console.error("[chatlog] outbound product:", e));
          }
        }
        return;
      }

      // NOTE: STORE_CALL / STORE_NAV / STORE_LINE tracking is now handled by
      // /api/v1/track/redirect (302 redirect with server-side event logging).
      // Buttons in storeCard.ts use direct URI actions through the tracking redirect.
    }

    // Unsupported event types — silently ignore
  } catch (error) {
    console.error("Event handling error:", error);
    try {
      if ("replyToken" in event) {
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: cfg.fallback_message }],
        });
      }
    } catch {
      // replyToken expired or already used
    }
  }
}
