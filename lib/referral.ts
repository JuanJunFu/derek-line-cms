/**
 * Referral System — DEREK LINE Bot 推薦碼
 *
 * 流程：
 * 1. 老客戶輸入「推薦」→ generateReferralCode() → 回傳 REF-XXXX
 * 2. 新客戶輸入 REF-XXXX → redeemReferralCode() → 建立關聯 + 通知推薦人
 */

import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

const CODE_LENGTH = 4;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 排除易混淆: 0/O, 1/I
const MAX_RETRIES = 5;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `REF-${code}`;
}

/**
 * Get the active LINE OA ID from DB settings.
 * Supports production/test environment switching.
 */
async function getActiveLineOaId(): Promise<string> {
  const cfg = await getSettings([
    "line_active_env",
    "line_oa_id_production",
    "line_oa_id_test",
  ]);

  const env = cfg.line_active_env || "production";
  const oaId =
    env === "test"
      ? cfg.line_oa_id_test || "@897utgnk"
      : cfg.line_oa_id_production || "@417cnroq";

  return oaId;
}

export interface ReferralResult {
  success: boolean;
  code?: string;
  message: string;
  flexMessage?: any; // LINE Flex Message object (for shareable card)
}

/**
 * Build a shareable referral Flex Message card.
 * All text content comes from DB settings for easy customization.
 */
async function buildReferralFlexMessage(code: string) {
  const cfg = await getSettings([
    "referral_brand_name",
    "referral_share_text",
    "flex_brand_color",
  ]);

  const lineOaId = await getActiveLineOaId();
  const brandName = cfg.referral_brand_name || "DEREK 德瑞克衛浴";
  const brandColor = cfg.flex_brand_color || "#B89A6A";

  // oaMessage URL: opens chat with OA and pre-fills the referral code
  const oaUrl = `https://line.me/R/oaMessage/${lineOaId}/?${encodeURIComponent(code)}`;

  // Share text from template
  const shareTextTemplate =
    cfg.referral_share_text ||
    "🤝 {brand} — 好友推薦\n\n我的推薦碼：{code}\n\n👉 點擊加入並自動輸入推薦碼：\n{url}";

  const shareText = shareTextTemplate
    .replace("{brand}", brandName)
    .replace("{code}", code)
    .replace("{url}", oaUrl);

  // LINE share picker URL: opens friend selection dialog
  const sharePickerUrl = `https://line.me/R/share?text=${encodeURIComponent(shareText)}`;

  return {
    type: "flex",
    altText: `我的推薦碼：${code}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: brandColor,
        paddingAll: "16px",
        contents: [
          { type: "text", text: `🤝 ${brandName}`, size: "sm", color: "#ffffff", align: "center" },
          { type: "text", text: "專屬推薦碼", size: "xl", weight: "bold", color: "#ffffff", align: "center", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        spacing: "lg",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F5F0E8",
            cornerRadius: "12px",
            paddingAll: "16px",
            contents: [
              { type: "text", text: code, size: "3xl", weight: "bold", color: brandColor, align: "center" },
            ],
          },
          { type: "text", text: "點擊「分享給朋友」選擇好友\n朋友收到後點連結即可自動輸入推薦碼", size: "sm", color: "#888888", wrap: true, align: "center" },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: brandColor,
            action: {
              type: "uri",
              label: "📤 分享給朋友",
              uri: sharePickerUrl,
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "uri",
              label: "👆 自己使用推薦連結",
              uri: oaUrl,
            },
          },
        ],
      },
    },
  };
}

/**
 * Generate a referral code for the given user.
 * If user already has a PENDING code, return the existing one.
 */
export async function generateReferralCode(userId: string): Promise<ReferralResult> {
  // Check for existing pending code
  const existing = await prisma.referral.findFirst({
    where: { referrerUserId: userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return {
      success: true,
      code: existing.code,
      message: `您的專屬推薦碼是 ${existing.code}`,
      flexMessage: await buildReferralFlexMessage(existing.code),
    };
  }

  // Generate unique code with retry
  for (let i = 0; i < MAX_RETRIES; i++) {
    const code = randomCode();
    try {
      await prisma.referral.create({
        data: {
          referrerUserId: userId,
          code,
          status: "PENDING",
        },
      });
      return {
        success: true,
        code,
        message: `您的專屬推薦碼是 ${code}`,
        flexMessage: await buildReferralFlexMessage(code),
      };
    } catch (err: unknown) {
      // Unique constraint violation → retry with new code
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        continue;
      }
      throw err;
    }
  }

  return {
    success: false,
    message: "系統忙碌，請稍後再試",
  };
}

/**
 * Redeem a referral code for the given user.
 * Validates: code exists, is PENDING, referee != referrer.
 */
export async function redeemReferralCode(
  code: string,
  refereeUserId: string
): Promise<ReferralResult> {
  const referral = await prisma.referral.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!referral) {
    return { success: false, message: "此推薦碼不存在，請確認後重新輸入" };
  }

  if (referral.status === "COMPLETED") {
    return { success: false, message: "此推薦碼已被使用" };
  }

  if (referral.referrerUserId === refereeUserId) {
    return { success: false, message: "無法使用自己的推薦碼" };
  }

  // Check if referee already has a referrer
  const refereeProfile = await prisma.userProfile.findUnique({
    where: { userId: refereeUserId },
  });
  if (refereeProfile?.referredBy) {
    return { success: false, message: "您已經使用過推薦碼了" };
  }

  // Complete the referral in a transaction
  await prisma.$transaction([
    prisma.referral.update({
      where: { id: referral.id },
      data: {
        refereeUserId: refereeUserId,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    }),
    prisma.userProfile.upsert({
      where: { userId: refereeUserId },
      create: {
        userId: refereeUserId,
        referredBy: referral.referrerUserId,
      },
      update: {
        referredBy: referral.referrerUserId,
      },
    }),
  ]);

  // Get referrer display name for the response
  const referrer = await prisma.userProfile.findUnique({
    where: { userId: referral.referrerUserId },
  });
  const referrerName = referrer?.displayName || "好友";

  return {
    success: true,
    message: `推薦碼兌換成功！您是由 ${referrerName} 推薦加入的 🎉`,
  };
}

/**
 * Get referral stats for a specific user.
 */
export async function getUserReferralStats(userId: string) {
  const [asReferrer, asReferee] = await Promise.all([
    prisma.referral.findMany({
      where: { referrerUserId: userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.referral.findFirst({
      where: { refereeUserId: userId, status: "COMPLETED" },
    }),
  ]);

  return {
    referrals: asReferrer,
    referredBy: asReferee,
    completedCount: asReferrer.filter((r) => r.status === "COMPLETED").length,
    pendingCount: asReferrer.filter((r) => r.status === "PENDING").length,
  };
}
