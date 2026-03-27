/**
 * Sequence Engine — DEREK LINE Bot 自動化旅程
 *
 * 負責：
 * 1. 觸發序列（triggerSequence）— 在 webhook 事件中呼叫
 * 2. 排程訊息（scheduleStep）— 建立 ScheduledMessage 記錄
 * 3. 執行到期訊息（processScheduledMessages）— 由 Cron 呼叫
 * 4. 記錄序列完成（completeSequenceStep）— 更新 sequenceState
 */

import { prisma } from "@/lib/prisma";
import { lineClient } from "@/lib/line";
import { SEQUENCE_TRIGGERS, RELATIONSHIP_SCORE_DELTAS } from "@/lib/constants";
import { getRelationshipLevel } from "@/lib/constants";

// ── Hardcoded new customer sequence (Phase 1 MVP) ──
// Phase 2 will make these DB-configurable via CMS.

export const NEW_CUSTOMER_SEQUENCE = {
  id: "hardcode_new_customer",
  name: "新客教育序列",
  trigger: SEQUENCE_TRIGGERS.NEW_CUSTOMER,
  steps: [
    {
      id: "step_day0",
      dayOffset: 0,
      messageType: "flex" as const,
      label: "歡迎訊息",
      content: buildWelcomeMessage(),
    },
    {
      id: "step_day3",
      dayOffset: 3,
      messageType: "flex" as const,
      label: "品類教育",
      content: buildCategoryEducationMessage(),
    },
    {
      id: "step_day7",
      dayOffset: 7,
      messageType: "flex" as const,
      label: "產品推薦（個人化）",
      content: null, // 由 scheduleStep 時根據標籤動態決定
    },
    {
      id: "step_day30",
      dayOffset: 30,
      messageType: "flex" as const,
      label: "追蹤訊息",
      content: buildFollowUpMessage(),
    },
  ],
};

export const REPAIR_SEQUENCE = {
  id: "hardcode_repair",
  name: "維修服務序列",
  trigger: SEQUENCE_TRIGGERS.REPAIR_INQUIRY,
  steps: [
    {
      id: "repair_day0",
      dayOffset: 0,
      messageType: "flex" as const,
      label: "維修服務即時回覆",
      content: buildRepairImmediateMessage(),
    },
    {
      id: "repair_day3",
      dayOffset: 3,
      messageType: "flex" as const,
      label: "升級推薦",
      content: buildRepairUpgradeMessage(),
    },
  ],
};

// ── Trigger logic ──

/**
 * Trigger new customer sequence on FOLLOW event.
 * Schedules Day 0/3/7/30 messages.
 */
export async function triggerNewCustomerSequence(userId: string): Promise<void> {
  try {
    const profile = await prisma.userProfile.findUnique({ where: { userId } });

    // Already started this sequence → skip
    const state = (profile?.sequenceState as Record<string, any>) ?? {};
    if (state.new_customer) return;

    const now = new Date();
    const seq = NEW_CUSTOMER_SEQUENCE;

    // Schedule all steps
    for (const step of seq.steps) {
      const scheduledAt = new Date(now.getTime() + step.dayOffset * 24 * 60 * 60 * 1000);
      await prisma.scheduledMessage.create({
        data: {
          userId,
          sequenceId: seq.id,
          stepId: step.id,
          scheduledAt,
          status: "pending",
        },
      });
    }

    // Update sequenceState
    await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        sequenceState: {
          new_customer: { currentStep: 0, startedAt: now.toISOString(), completedAt: null },
        },
      },
      update: {
        sequenceState: {
          ...state,
          new_customer: { currentStep: 0, startedAt: now.toISOString(), completedAt: null },
        },
      },
    });
  } catch (err) {
    console.error("[sequence] triggerNewCustomerSequence failed:", err);
  }
}

/**
 * Trigger repair sequence on repair keyword.
 */
export async function triggerRepairSequence(userId: string): Promise<void> {
  try {
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const state = (profile?.sequenceState as Record<string, any>) ?? {};

    // Allow re-trigger (each repair inquiry starts fresh)
    const now = new Date();
    const seq = REPAIR_SEQUENCE;

    for (const step of seq.steps) {
      const scheduledAt = new Date(now.getTime() + step.dayOffset * 24 * 60 * 60 * 1000);
      await prisma.scheduledMessage.create({
        data: {
          userId,
          sequenceId: seq.id,
          stepId: step.id,
          scheduledAt,
          status: "pending",
        },
      });
    }

    await prisma.userProfile.update({
      where: { userId },
      data: {
        sequenceState: {
          ...state,
          repair: { startedAt: now.toISOString(), completedAt: null },
        },
      },
    });
  } catch (err) {
    console.error("[sequence] triggerRepairSequence failed:", err);
  }
}

// ── Cron processor (called by /api/cron/sequence) ──

/**
 * Process all pending scheduled messages that are due.
 * Uses atomic status update to prevent duplicate sending (idempotent).
 *
 * @returns number of messages processed
 */
export async function processScheduledMessages(): Promise<{ processed: number }> {
  const now = new Date();
  let processed = 0;

  // Atomic: claim pending messages → set to 'processing' first
  // This prevents duplicate sends in multi-pod deployments
  const claimed = await prisma.$transaction(async (tx) => {
    const due = await tx.scheduledMessage.findMany({
      where: { status: "pending", scheduledAt: { lte: now } },
      take: 50, // process in batches
      orderBy: { scheduledAt: "asc" },
    });

    if (due.length === 0) return [];

    const ids = due.map((m) => m.id);
    await tx.scheduledMessage.updateMany({
      where: { id: { in: ids }, status: "pending" }, // double-check status
      data: { status: "processing" },
    });

    return due;
  });

  for (const msg of claimed) {
    try {
      await sendScheduledMessage(msg);
      await prisma.scheduledMessage.update({
        where: { id: msg.id },
        data: { status: "sent", sentAt: new Date() },
      });

      // Handle sequence completion (Day30 = last step)
      await onMessageSent(msg);
      processed++;
    } catch (err) {
      console.error(`[sequence] Failed to send message ${msg.id}:`, err);
      // Reset to pending for retry (next cron run)
      await prisma.scheduledMessage.update({
        where: { id: msg.id },
        data: { status: "pending" },
      });
    }
  }

  return { processed };
}

async function sendScheduledMessage(msg: {
  id: string;
  userId: string;
  sequenceId: string;
  stepId: string;
}): Promise<void> {
  // Find step content from hardcoded sequences
  const step = findStep(msg.sequenceId, msg.stepId);
  if (!step) {
    console.warn(`[sequence] Step not found: seq=${msg.sequenceId} step=${msg.stepId}`);
    return;
  }

  // Day 7: personalise based on user tags
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let content: any = step.content;
  if (msg.stepId === "step_day7") {
    const profile = await prisma.userProfile.findUnique({ where: { userId: msg.userId } });
    content = buildDay7PersonalizedMessage(profile?.tags ?? []);
  }

  if (!content) return;

  await lineClient.pushMessage({ to: msg.userId, messages: [content as any] });
}

async function onMessageSent(msg: {
  userId: string;
  sequenceId: string;
  stepId: string;
}): Promise<void> {
  // Track sequence completion on Day30 send
  if (msg.stepId === "step_day30") {
    const profile = await prisma.userProfile.findUnique({ where: { userId: msg.userId } });
    if (!profile) return;

    const state = (profile.sequenceState as Record<string, any>) ?? {};
    const newScore = Math.min(
      (profile.relationshipScore ?? 0) + RELATIONSHIP_SCORE_DELTAS.SEQUENCE_COMPLETE,
      100
    );

    await prisma.userProfile.update({
      where: { userId: msg.userId },
      data: {
        relationshipScore: newScore,
        relationshipLevel: getRelationshipLevel(newScore),
        sequenceState: {
          ...state,
          new_customer: {
            ...(state.new_customer ?? {}),
            completedAt: new Date().toISOString(),
          },
        },
      },
    });
  }
}

function findStep(sequenceId: string, stepId: string) {
  const sequences = [NEW_CUSTOMER_SEQUENCE, REPAIR_SEQUENCE];
  for (const seq of sequences) {
    if (seq.id === sequenceId) {
      return seq.steps.find((s) => s.id === stepId) ?? null;
    }
  }
  return null;
}

// ── Message builders ──

function buildWelcomeMessage() {
  return {
    type: "flex",
    altText: "歡迎加入 DEREK 德瑞克衛浴",
    contents: {
      type: "bubble",
      hero: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#B89A6A",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "DEREK 德瑞克衛浴", size: "xl", weight: "bold", color: "#ffffff", align: "center" },
          { type: "text", text: "打造理想衛浴空間", size: "sm", color: "#ffffff", align: "center", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "md",
        contents: [
          { type: "text", text: "感謝您加入 DEREK 官方帳號！", weight: "bold", size: "md" },
          { type: "text", text: "我們提供馬桶、面盆、龍頭、浴缸等完整衛浴解決方案，全台 10 間門市均可親身體驗。", size: "sm", color: "#555555", wrap: true, margin: "sm" },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#B89A6A",
            action: {
              type: "postback",
              label: "🏠 瀏覽產品分類",
              data: "action=SHOW_PRODUCT_MENU",
              displayText: "我想看看有哪些產品",
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "📍 找附近門市",
              data: "action=SHOW_REGION_MENU",
              displayText: "幫我找附近的門市",
            },
          },
        ],
      },
    },
  };
}

function buildCategoryEducationMessage() {
  return {
    type: "flex",
    altText: "認識衛浴產品分類 — DEREK 教你怎麼選",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "md",
        contents: [
          { type: "text", text: "🏠 衛浴怎麼選？", weight: "bold", size: "lg" },
          { type: "text", text: "不同需求有不同重點，3分鐘了解衛浴產品怎麼挑", size: "sm", color: "#555555", wrap: true, margin: "sm" },
          { type: "separator", margin: "lg" },
          buildEducationRow("🚽 馬桶", "注重沖水效率、省水、好清潔"),
          buildEducationRow("💺 智慧馬桶座", "溫水洗淨、暖座、除臭功能"),
          buildEducationRow("🪣 面盆/浴櫃", "收納空間、尺寸、安裝方式"),
          buildEducationRow("🚿 龍頭", "水壓穩定、節水、材質選擇"),
          buildEducationRow("🛁 浴缸", "泡澡享受、空間規劃、安全考量"),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#B89A6A",
            action: {
              type: "postback",
              label: "我想了解更多",
              data: "action=SHOW_PRODUCT_MENU",
              displayText: "我想了解更多產品",
            },
          },
        ],
      },
    },
  };
}

function buildEducationRow(title: string, desc: string) {
  return {
    type: "box",
    layout: "horizontal",
    margin: "sm",
    contents: [
      { type: "text", text: title, size: "sm", weight: "bold", flex: 2 },
      { type: "text", text: desc, size: "xs", color: "#777777", flex: 3, wrap: true },
    ],
  };
}

function buildDay7PersonalizedMessage(tags: string[]) {
  // Determine which product to recommend based on tags
  let category = "toilet";
  let categoryName = "馬桶";
  let emoji = "🚽";
  let tip = "智慧馬桶 + 免治馬桶座的組合，是最多家庭的選擇";

  if (tags.includes("Intent:Luxury_Living")) {
    category = "bathtub"; categoryName = "浴缸"; emoji = "🛁";
    tip = "獨立浴缸能讓您每天都享有飯店等級的沐浴體驗";
  } else if (tags.includes("Intent:Storage_Space")) {
    category = "basin"; categoryName = "面盆/浴櫃"; emoji = "🪣";
    tip = "好的浴櫃組合能讓浴室空間感倍增";
  } else if (tags.includes("Intent:Quick_Fix")) {
    category = "faucet"; categoryName = "龍頭"; emoji = "🚿";
    tip = "換一支好龍頭，水壓、省水一次解決";
  } else if (tags.includes(SMART_TOILET_INTENT_TAG)) {
    category = "toilet_smart"; categoryName = "智慧馬桶"; emoji = "🧠";
    tip = "DEREK 5大智慧系列，找到最適合您的那一款";
  }

  return {
    type: "flex",
    altText: `根據您的興趣，推薦 ${categoryName}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "md",
        contents: [
          { type: "text", text: `${emoji} 根據您的瀏覽，推薦您`, size: "sm", color: "#B89A6A", weight: "bold" },
          { type: "text", text: categoryName, size: "xxl", weight: "bold" },
          { type: "text", text: tip, size: "sm", color: "#555555", wrap: true, margin: "md" },
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
            color: "#B89A6A",
            action: {
              type: "postback",
              label: `查看 ${categoryName}`,
              data: `action=PRODUCT_VIEW&category=${category}`,
              displayText: `我想看 ${categoryName}`,
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "📍 到門市親眼看看",
              data: "action=SHOW_REGION_MENU",
              displayText: "想去門市看實品",
            },
          },
        ],
      },
    },
  };
}

const SMART_TOILET_INTENT_TAG = "Intent:SmartToilet_High";

function buildFollowUpMessage() {
  return {
    type: "flex",
    altText: "找到您需要的衛浴了嗎？",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "md",
        contents: [
          { type: "text", text: "DEREK 關心您 👋", weight: "bold", size: "md", color: "#B89A6A" },
          { type: "text", text: "找到您需要的衛浴了嗎？\n我們的門市顧問很樂意為您提供專業建議。", size: "sm", color: "#555555", wrap: true },
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
            color: "#B89A6A",
            action: {
              type: "postback",
              label: "🏪 找到我附近的門市",
              data: "action=SHOW_REGION_MENU",
              displayText: "幫我找附近門市",
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "🔍 繼續瀏覽產品",
              data: "action=SHOW_PRODUCT_MENU",
              displayText: "我繼續看看",
            },
          },
        ],
      },
    },
  };
}

function buildRepairImmediateMessage() {
  return {
    type: "flex",
    altText: "DEREK 維修服務",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1a1a2e",
        paddingAll: "12px",
        contents: [
          { type: "text", text: "🔧 DEREK 維修服務", weight: "bold", color: "#ffffff" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "md",
        contents: [
          { type: "text", text: "感謝您使用 DEREK 產品！", weight: "bold" },
          { type: "text", text: "我們的售後服務團隊將盡快協助您解決問題。", size: "sm", color: "#555555", wrap: true },
          { type: "separator", margin: "lg" },
          {
            type: "box", layout: "horizontal", margin: "md",
            contents: [
              { type: "text", text: "服務電話", size: "sm", flex: 2 },
              { type: "text", text: "0800-XXX-XXX", size: "sm", weight: "bold", flex: 3, color: "#B89A6A" },
            ],
          },
          {
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: "服務時間", size: "sm", flex: 2 },
              { type: "text", text: "週一至週六 9:00-18:00", size: "sm", flex: 3, color: "#555555" },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#B89A6A",
            action: {
              type: "postback",
              label: "📍 前往最近門市",
              data: "action=SHOW_REGION_MENU",
              displayText: "我要找最近的門市",
            },
          },
        ],
      },
    },
  };
}

function buildRepairUpgradeMessage() {
  return {
    type: "flex",
    altText: "是否考慮升級您的衛浴設備？",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "md",
        contents: [
          { type: "text", text: "💡 維修之外，考慮升級看看？", weight: "bold", size: "md", color: "#B89A6A" },
          { type: "text", text: "使用多年後，換一套新的衛浴設備，不只解決問題，更能提升每天的生活品質。", size: "sm", color: "#555555", wrap: true },
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
            color: "#B89A6A",
            action: {
              type: "postback",
              label: "🚽 看看智慧馬桶",
              data: "action=PRODUCT_VIEW&category=toilet_smart",
              displayText: "我想了解智慧馬桶",
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "📋 瀏覽所有產品",
              data: "action=SHOW_PRODUCT_MENU",
              displayText: "我想看所有產品",
            },
          },
        ],
      },
    },
  };
}
