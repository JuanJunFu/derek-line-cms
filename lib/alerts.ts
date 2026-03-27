import { prisma } from "@/lib/prisma";
import { lineClient } from "@/lib/line";
import { getSetting } from "@/lib/settings";

// ── Alert event types that map to rule.eventType ──
type AlertEventType = "LEAD_HOT" | "FALLBACK_3X" | "STORE_REPEAT" | "NEW_FOLLOW";

type AlertContext = {
  userId: string;
  displayName?: string | null;
  storeId?: string | null;
  storeName?: string | null;
  regionName?: string | null;
  tags: string[];
  eventType: string;
};

/**
 * Determine which alert event types are triggered by a tracking event.
 */
function mapToAlertEvents(
  eventType: string,
  prevLeadScore: string | null,
  newLeadScore: string,
  fallbackCount: number
): AlertEventType[] {
  const alerts: AlertEventType[] = [];

  // LEAD_HOT: user just upgraded to HOT (was not HOT before)
  if (newLeadScore === "HOT" && prevLeadScore !== "HOT") {
    alerts.push("LEAD_HOT");
  }

  // FALLBACK_3X: 3+ fallbacks in 24h
  if (eventType === "FALLBACK" && fallbackCount >= 3) {
    alerts.push("FALLBACK_3X");
  }

  // NEW_FOLLOW: new user
  if (eventType === "FOLLOW") {
    alerts.push("NEW_FOLLOW");
  }

  return alerts;
}

/**
 * Check for STORE_REPEAT: same store queried 2+ times within window.
 */
async function checkStoreRepeat(
  userId: string,
  storeId: string | null | undefined,
  windowMin: number
): Promise<boolean> {
  if (!storeId) return false;
  const windowAgo = new Date(Date.now() - windowMin * 60 * 1000);
  const count = await prisma.userEvent.count({
    where: {
      userId,
      storeId,
      createdAt: { gte: windowAgo },
    },
  });
  return count >= 2;
}

/**
 * Build notification message in Chinese.
 */
function buildAlertMessage(ruleName: string, ctx: AlertContext): string {
  const lines: string[] = [`🔔 ${ruleName}`];
  lines.push("");
  if (ctx.storeName) lines.push(`🏪 門市：${ctx.storeName}`);
  if (ctx.regionName) lines.push(`📍 地區：${ctx.regionName}`);
  lines.push(`👤 客戶：${ctx.displayName || ctx.userId.slice(0, 10) + "..."}`);

  // Translate tags
  const zhTags = ctx.tags
    .filter((t) => t.startsWith("Intent:") || t.startsWith("Region:"))
    .slice(0, 4)
    .map((t) => TAG_ZH[t] || t)
    .join("、");
  if (zhTags) lines.push(`🏷 標籤：${zhTags}`);

  // Suggest action
  if (ctx.eventType === "STORE_CALL" || ctx.eventType === "STORE_NAV") {
    lines.push("");
    lines.push("💡 建議：主動聯繫，提供展間導覽或優惠資訊");
  }
  if (ctx.eventType === "FALLBACK") {
    lines.push("");
    lines.push("💡 建議：用戶多次查無結果，建議人工回覆協助");
  }

  return lines.join("\n");
}

const TAG_ZH: Record<string, string> = {
  "Intent:Comfort_High": "需求：馬桶/免治",
  "Intent:Storage_Space": "需求：面盆/浴櫃",
  "Intent:Quick_Fix": "需求：龍頭更換",
  "Intent:Luxury_Living": "需求：浴缸",
  "Intent:Safety_Care": "需求：無障礙設備",
  "Intent:Maintenance": "需求：配件/維護",
  "Region:taipei": "大台北",
  "Region:hsinchu": "竹苗",
  "Region:taichung": "台中",
  "Region:tainan": "台南",
  "Region:kaohsiung": "高雄",
  "Region:others": "其他",
};

/**
 * Push LINE notification to all configured admin user IDs.
 */
async function pushLineAlert(message: string): Promise<boolean> {
  try {
    const adminIds = await getSetting("alert_line_user_ids");
    if (!adminIds) return false;

    const ids = adminIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) return false;

    for (const id of ids) {
      try {
        await lineClient.pushMessage({
          to: id,
          messages: [{ type: "text", text: message }],
        });
      } catch (err) {
        console.error(`[alerts] Failed to push to ${id}:`, err);
      }
    }
    return true;
  } catch (err) {
    console.error("[alerts] pushLineAlert error:", err);
    return false;
  }
}

/**
 * Main entry: check all active alert rules against the current event.
 * Called at the end of trackEvent().
 */
export async function checkAlerts(
  ctx: AlertContext,
  prevLeadScore: string | null,
  newLeadScore: string,
  fallbackCount: number
): Promise<void> {
  try {
    // 1. Get all active rules
    const rules = await prisma.alertRule.findMany({
      where: { isActive: true },
    });
    if (rules.length === 0) return;

    // 2. Determine which alert types are triggered
    const triggered = mapToAlertEvents(
      ctx.eventType,
      prevLeadScore,
      newLeadScore,
      fallbackCount
    );

    // 3. Check STORE_REPEAT separately (needs window query)
    for (const rule of rules) {
      if (rule.eventType === "STORE_REPEAT") {
        const window = rule.windowMin || 5;
        const isRepeat = await checkStoreRepeat(
          ctx.userId,
          ctx.storeId,
          window
        );
        if (isRepeat && !triggered.includes("STORE_REPEAT")) {
          triggered.push("STORE_REPEAT");
        }
      }
    }

    // 4. Process each matching rule
    for (const rule of rules) {
      if (!triggered.includes(rule.eventType as AlertEventType)) continue;

      const message = buildAlertMessage(rule.name, ctx);

      // Push LINE notification if enabled
      let lineNotified = false;
      if (rule.notifyLine) {
        lineNotified = await pushLineAlert(message);
      }

      // Write alert log
      await prisma.alertLog.create({
        data: {
          ruleId: rule.id,
          userId: ctx.userId,
          userName: ctx.displayName ?? null,
          storeId: ctx.storeId ?? null,
          storeName: ctx.storeName ?? null,
          regionName: ctx.regionName ?? null,
          message,
          tags: ctx.tags,
          lineNotified,
        },
      });
    }
  } catch (error) {
    console.error("[alerts] checkAlerts failed:", error);
    // Non-blocking — alert failure must not break LINE reply
  }
}
