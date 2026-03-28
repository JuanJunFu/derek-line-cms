import { NextRequest, NextResponse } from "next/server";
import type { WebhookEvent } from "@line/bot-sdk";
import { lineClient, verifyLineSignature } from "@/lib/line";
import { prisma } from "@/lib/prisma";
import { buildRegionMenu } from "@/lib/flex/regionMenu";
import { buildStoreCarousel } from "@/lib/flex/storeCard";
import { buildProductMenu, buildProductReply } from "@/lib/flex/productMenu";
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
      } else if (reply.type === "product_menu") {
        const menu = await buildProductMenu();
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [menu as any],
        });
      } else {
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: reply.text }],
        });
      }
      return;
    }

    // ── Postback ──
    if (event.type === "postback") {
      const params = new URLSearchParams(event.postback.data);
      const action = params.get("action");

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
        return;
      }

      // Sequence button: show region menu
      if (action === "SHOW_REGION_MENU") {
        const menu = await buildRegionMenu();
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [menu as any],
        });
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
        }
        return;
      }

      // Store action (two-step: record → reply with clickable URI button)
      if (action === "STORE_CALL" || action === "STORE_NAV" || action === "STORE_LINE") {
        const storeId = params.get("storeId") ?? "";
        const uri = decodeURIComponent(params.get("uri") ?? "");

        if (userId) {
          await trackEvent(userId, action, { storeId }, webhookEventId);
        }

        if (uri) {
          const labelMap = {
            STORE_CALL: { text: "📞 請點擊下方按鈕撥號", btn: "📞 立即撥打", color: "#1a1a1a" },
            STORE_NAV: { text: "📍 請點擊下方按鈕開啟導航", btn: "📍 開啟 Google Maps", color: "#06C755" },
            STORE_LINE: { text: "💬 請點擊下方按鈕開啟門市 LINE", btn: "💬 加入門市 LINE", color: "#06C755" },
          };
          const lbl = labelMap[action as keyof typeof labelMap];

          await lineClient.replyMessage({
            replyToken: event.replyToken,
            messages: [
              {
                type: "flex",
                altText: lbl.text,
                contents: {
                  type: "bubble",
                  body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                      { type: "text", text: lbl.text, size: "sm", color: "#888888", wrap: true },
                    ],
                    paddingAll: "16px",
                  },
                  footer: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                      {
                        type: "button",
                        style: "primary",
                        color: lbl.color,
                        action: { type: "uri", label: lbl.btn, uri: uri },
                      },
                    ],
                  },
                },
              } as any,
            ],
          });
        }
        return;
      }
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
