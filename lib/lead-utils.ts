/**
 * Lead page shared utilities — used by both API and Client Components.
 * Single source of truth for tag display, colors, time formatting, live score computation.
 */

import { HOT_DECAY_DAYS } from "@/lib/constants";

// ── Tag → Chinese display name ──
export const TAG_ZH: Record<string, string> = {
  "Intent:Comfort_High": "馬桶/免治",
  "Intent:SmartToilet_High": "智慧馬桶",
  "Intent:Storage_Space": "面盆/浴櫃",
  "Intent:Quick_Fix": "龍頭更換",
  "Intent:Luxury_Living": "浴缸",
  "Intent:Safety_Care": "無障礙",
  "Intent:Maintenance": "配件",
  "Region:taipei": "大台北",
  "Region:hsinchu": "竹苗",
  "Region:taichung": "台中",
  "Region:tainan": "台南",
  "Region:kaohsiung": "高雄",
  "Status:High_Purchase_Intent": "高意圖",
  "Status:Needs_Human": "需人工",
  "Status:Blocked": "已封鎖",
  "Role:Service_Needed": "維修",
};

export const REL_LEVEL_COLORS: Record<string, string> = {
  "新識": "text-gray-400",
  "認識": "text-blue-400",
  "熟識": "text-emerald-400",
  "信任": "text-amber-400",
  "忠誠": "text-orange-400",
};

export const TAG_BG_COLORS: Record<string, string> = {
  Intent: "bg-blue-900/40 text-blue-300",
  Region: "bg-green-900/40 text-green-300",
  Status: "bg-red-900/40 text-red-300",
  Role: "bg-yellow-900/40 text-yellow-300",
};

export function getTagStyle(tag: string): string {
  const prefix = tag.split(":")[0];
  return TAG_BG_COLORS[prefix] ?? "bg-gray-700 text-gray-300";
}

// ── Time formatting (Taiwan timezone UTC+8) ──

/** Format Date to Taiwan locale string */
export function toTaiwanTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
}

/** Relative time ago in Chinese (Taiwan time aware) */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  return `${months} 個月前`;
}

// ── Live score with HOT decay ──

export type Quadrant = "hot_high" | "hot_low" | "cold_high" | "cold_low";

export interface ScoredProfile {
  userId: string;
  displayName: string | null;
  tags: string[];
  leadScore: string;
  hotSince: Date | string | null;
  lastActive: Date | string;
  firstSeen: Date | string;
  totalEvents: number;
  isBlocked: boolean;
  relationshipScore: number;
  relationshipLevel: string;
  customerType: string;
  liveScore: string;
  quadrant: Quadrant;
}

/**
 * Compute live lead score with HOT time decay (90 days).
 * Returns the actual score after decay.
 */
export function computeLiveScore(
  leadScore: string,
  hotSince: Date | string | null,
  tags: string[],
  now?: number
): string {
  const timestamp = now ?? Date.now();
  if (leadScore !== "HOT") return leadScore;
  if (!hotSince) return leadScore;

  const hotDate = typeof hotSince === "string" ? new Date(hotSince) : hotSince;
  const daysSinceHot = (timestamp - hotDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceHot <= HOT_DECAY_DAYS) return "HOT";

  const hasIntent = tags.some((t) => t.startsWith("Intent:"));
  return hasIntent ? "WARM" : "COLD";
}

/**
 * Determine which quadrant a profile belongs to.
 * High relationship: score >= 41 (熟識/信任/忠誠)
 * High intent: HOT
 */
export function getQuadrant(liveScore: string, relationshipScore: number): Quadrant {
  const isHot = liveScore === "HOT";
  const isHighRel = relationshipScore >= 41;
  if (isHot && isHighRel) return "hot_high";
  if (isHot && !isHighRel) return "hot_low";
  if (!isHot && isHighRel) return "cold_high";
  return "cold_low";
}

export const QUADRANT_META: Record<Quadrant, { emoji: string; title: string; subtitle: string; desc: string; color: string; titleColor: string }> = {
  hot_high:  { emoji: "🔥", title: "立即跟進", subtitle: "高意圖 × 高關係", desc: "HOT + 熟識/信任/忠誠", color: "border-red-700/50 bg-red-900/20", titleColor: "text-red-400" },
  hot_low:   { emoji: "⚡", title: "快速教育", subtitle: "高意圖 × 低關係", desc: "HOT + 新識/認識", color: "border-amber-700/50 bg-amber-900/20", titleColor: "text-amber-400" },
  cold_high: { emoji: "💎", title: "長期客戶", subtitle: "低意圖 × 高關係", desc: "WARM/COLD + 熟識以上", color: "border-blue-700/50 bg-blue-900/20", titleColor: "text-blue-400" },
  cold_low:  { emoji: "🌱", title: "培育期",   subtitle: "低意圖 × 低關係", desc: "WARM/COLD + 新識/認識", color: "border-gray-700/50 bg-gray-900/20", titleColor: "text-gray-400" },
};

// ── Sort options ──
export const SORT_OPTIONS = [
  { value: "lastActive",        label: "最後活躍" },
  { value: "relationshipScore", label: "關係分數" },
  { value: "totalEvents",       label: "互動次數" },
] as const;

export type SortField = typeof SORT_OPTIONS[number]["value"];
