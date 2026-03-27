// ── Shared constants for DEREK LINE CMS ──
// Single source of truth — import from here, never re-define elsewhere.

// Lead scoring
export const HOT_DECAY_DAYS = 90; // 衛浴決策週期長，延長至 90 天

// Relationship scoring
export const RELATIONSHIP_SCORE_MAX = 100;
export const RELATIONSHIP_DECAY_DAYS = 90; // 90天無互動 → -10分

export const RELATIONSHIP_SCORE_DELTAS = {
  PRODUCT_VIEW: 5,       // 上限 20（4次）
  PRODUCT_VIEW_CAP: 20,
  REGION_SELECT: 10,
  STORE_CALL: 15,
  STORE_NAV: 15,
  STORE_LINE: 15,
  SEQUENCE_COMPLETE: 20, // 新客教育序列完成（Day30送出時自動）
  REPAIR_INQUIRY: 25,    // 維修詢問（老客識別觸發點）
  POSTBACK_CLICK: 30,    // 序列 Flex 中點擊任一 Postback action
  DECAY: -10,            // 每 90 天無互動
} as const;

export const RELATIONSHIP_LEVELS = [
  { min: 0,  max: 20,  label: "新識" },
  { min: 21, max: 40,  label: "認識" },
  { min: 41, max: 60,  label: "熟識" },
  { min: 61, max: 80,  label: "信任" },
  { min: 81, max: 100, label: "忠誠" },
] as const;

// Customer type
export const CUSTOMER_TYPES = {
  NEW: "new",
  RETURNING: "returning",
} as const;

// Repair keywords → customerType = returning
export const REPAIR_KEYWORDS = ["維修", "漏水", "故障", "壞了", "修理", "零件", "損壞", "不出水"];

// Smart toilet intent
export const SMART_TOILET_INTENT_TAG = "Intent:SmartToilet_High";

// Store interaction events → HOT trigger
export const HOT_EVENTS = ["STORE_CALL", "STORE_NAV", "STORE_LINE"] as const;

// Referral system
export const REFERRAL_KEYWORDS = ["推薦", "推荐", "邀請碼", "推薦碼"];
export const REFERRAL_CODE_PATTERN = /^REF-[A-Z2-9]{4}$/i;
export const REFERRAL_SCORE_DELTA = {
  REFERRER: 15,  // 推薦人：成功推薦一位新客
  REFEREE: 10,   // 被推薦人：使用推薦碼加入
} as const;

// Sequence triggers
export const SEQUENCE_TRIGGERS = {
  NEW_CUSTOMER: "new_customer",
  REPAIR_INQUIRY: "repair_inquiry",
  PRODUCT_VIEW_SMART: "product_view_smart",
} as const;

/**
 * Get relationship level label from score.
 */
export function getRelationshipLevel(score: number): string {
  for (const level of RELATIONSHIP_LEVELS) {
    if (score >= level.min && score <= level.max) return level.label;
  }
  return "新識";
}
