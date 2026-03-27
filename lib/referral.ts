/**
 * Referral System — DEREK LINE Bot 推薦碼
 *
 * 流程：
 * 1. 老客戶輸入「推薦」→ generateReferralCode() → 回傳 REF-XXXX
 * 2. 新客戶輸入 REF-XXXX → redeemReferralCode() → 建立關聯 + 通知推薦人
 */

import { prisma } from "@/lib/prisma";

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

export interface ReferralResult {
  success: boolean;
  code?: string;
  message: string;
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
      message: `您的專屬推薦碼是 ${existing.code}\n\n請分享給朋友，對方加入好友後輸入此推薦碼即可完成推薦！`,
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
        message: `您的專屬推薦碼是 ${code}\n\n請分享給朋友，對方加入好友後輸入此推薦碼即可完成推薦！`,
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
