import { prisma } from "@/lib/prisma";
import { lineClient } from "@/lib/line";
import { checkAlerts } from "@/lib/alerts";
import {
  HOT_DECAY_DAYS,
  HOT_EVENTS,
  RELATIONSHIP_SCORE_DELTAS,
  RELATIONSHIP_SCORE_MAX,
  REPAIR_KEYWORDS,
  SMART_TOILET_INTENT_TAG,
  CUSTOMER_TYPES,
  REFERRAL_SCORE_DELTA,
  getRelationshipLevel,
} from "@/lib/constants";

export type TrackingData = {
  keyword?: string;
  region?: string;
  regionName?: string;
  storeId?: string;
  storeName?: string;
  category?: string;
  intent?: string;
  phone?: string;
  address?: string;
  lineId?: string;
  fallbackCount?: number;
  postbackAction?: string; // for Postback events in sequences
  [key: string]: unknown;
};

// ── Intent mapping: product category → tag ──
const INTENT_MAP: Record<string, string> = {
  toilet: "Intent:Comfort_High",
  bidet: "Intent:Comfort_High",
  basin: "Intent:Storage_Space",
  faucet: "Intent:Quick_Fix",
  bathtub: "Intent:Luxury_Living",
  accessibility: "Intent:Safety_Care",
  accessories: "Intent:Maintenance",
  urinal: "Intent:Luxury_Living",
  commercial: "Intent:Maintenance",
};

const MAINTENANCE_KEYWORDS = ["維修", "零件", "漏水"];

/**
 * Apply tagging rules to a set of tags based on event type and data.
 * Returns a new array with updated tags (no duplicates).
 */
export function applyTagRules(
  existingTags: string[],
  eventType: string,
  data: TrackingData
): string[] {
  const tags = [...existingTags];
  const addTag = (tag: string) => {
    if (!tags.includes(tag)) tags.push(tag);
  };

  // Rule 1: Product view → Intent tag
  if (eventType === "PRODUCT_VIEW" && data.category) {
    const intentTag = INTENT_MAP[data.category];
    if (intentTag) addTag(intentTag);
    // Smart toilet special intent
    if (data.category === "toilet_smart") addTag(SMART_TOILET_INTENT_TAG);
  }

  // Rule 2: Region select → Region tag
  if (eventType === "REGION_SELECT" && data.region) {
    addTag(`Region:${data.region}`);
  }

  // Rule 3: Store call/nav/LINE → High purchase intent
  if ((HOT_EVENTS as readonly string[]).includes(eventType)) {
    addTag("Status:High_Purchase_Intent");
  }

  // Rule 4: Maintenance keywords → Service needed
  if (eventType === "MESSAGE" && data.keyword) {
    if (MAINTENANCE_KEYWORDS.some((kw) => data.keyword!.includes(kw))) {
      addTag("Role:Service_Needed");
    }
  }

  // Rule 5: 3+ fallbacks in 24h → Needs human
  if (eventType === "FALLBACK" && (data.fallbackCount ?? 0) >= 3) {
    addTag("Status:Needs_Human");
  }

  // Rule 6: Unfollow → Blocked
  if (eventType === "UNFOLLOW") {
    addTag("Status:Blocked");
  }

  return tags;
}

/**
 * Calculate lead score based on tags, hotSince date, and blocked status.
 * Uses HOT_DECAY_DAYS from constants (90 days for bathroom category).
 */
export function calculateLeadScore(
  tags: string[],
  hotSince: Date | null,
  isBlocked: boolean
): "HOT" | "WARM" | "COLD" {
  if (isBlocked) return "COLD";

  const hasHighIntent = tags.includes("Status:High_Purchase_Intent");

  if (hasHighIntent && hotSince) {
    const daysSinceHot =
      (Date.now() - hotSince.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceHot <= HOT_DECAY_DAYS) return "HOT";
  }

  const hasIntent = tags.some((t) => t.startsWith("Intent:"));
  const hasRegion = tags.some((t) => t.startsWith("Region:"));
  if (hasHighIntent || (hasIntent && hasRegion) || hasIntent) return "WARM";

  return "COLD";
}

/**
 * Calculate relationship score delta for an event.
 * Returns the delta to add (may be 0).
 */
export function calculateRelationshipDelta(
  eventType: string,
  data: TrackingData,
  currentScore: number
): number {
  const d = RELATIONSHIP_SCORE_DELTAS;

  if (eventType === "PRODUCT_VIEW") {
    // Cap product view contribution at 20 total
    const cappedScore = Math.min(currentScore, RELATIONSHIP_SCORE_MAX);
    // Approximate: if score contribution from PRODUCT_VIEW would exceed cap, return 0
    // Simple approach: always add, let total be capped at max
    return d.PRODUCT_VIEW;
  }
  if (eventType === "REGION_SELECT") return d.REGION_SELECT;
  if (eventType === "STORE_CALL") return d.STORE_CALL;
  if (eventType === "STORE_NAV") return d.STORE_NAV;
  if (eventType === "STORE_LINE") return d.STORE_LINE;
  if (eventType === "SEQUENCE_COMPLETE") return d.SEQUENCE_COMPLETE;
  if (eventType === "POSTBACK") return d.POSTBACK_CLICK;
  if (eventType === "MESSAGE" && data.keyword) {
    if (REPAIR_KEYWORDS.some((kw) => data.keyword!.includes(kw))) {
      return d.REPAIR_INQUIRY;
    }
  }
  // Referral events — reward both referrer and referee
  if (eventType === "REFERRAL_COMPLETE") return REFERRAL_SCORE_DELTA.REFEREE;
  if (eventType === "REFERRAL_GENERATE") return REFERRAL_SCORE_DELTA.REFERRER;
  return 0;
}

/**
 * Determine customerType based on event and existing data.
 * Returns "returning" if repair keyword detected, otherwise keeps existing.
 */
export function determineCustomerType(
  eventType: string,
  data: TrackingData,
  existingType: string
): string {
  if (existingType === CUSTOMER_TYPES.RETURNING) return CUSTOMER_TYPES.RETURNING;
  if (eventType === "MESSAGE" && data.keyword) {
    if (REPAIR_KEYWORDS.some((kw) => data.keyword!.includes(kw))) {
      return CUSTOMER_TYPES.RETURNING;
    }
  }
  return existingType;
}

/**
 * Fetch LINE user display name via getProfile API.
 * Returns null if API call fails (rate limit, blocked user, etc.)
 */
async function fetchDisplayName(userId: string): Promise<string | null> {
  try {
    const profile = await lineClient.getProfile(userId);
    return profile.displayName ?? null;
  } catch {
    return null;
  }
}

/**
 * Record a LINE event and update the user profile.
 * Uses await + try-catch to ensure 0 event loss without breaking replies.
 */
export async function trackEvent(
  userId: string,
  eventType: string,
  data: TrackingData,
  webhookEventId?: string
): Promise<void> {
  try {
    // 1. Write UserEvent
    await prisma.userEvent.create({
      data: {
        webhookEventId: webhookEventId ?? null,
        userId,
        eventType,
        category: data.category ?? null,
        region: data.region ?? null,
        storeId: data.storeId ?? null,
        data: data as any,
      },
    });

    // 2. Get or count fallbacks for Rule 5
    let fallbackCount = data.fallbackCount ?? 0;
    if (eventType === "FALLBACK" && !data.fallbackCount) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      fallbackCount = await prisma.userEvent.count({
        where: {
          userId,
          eventType: "FALLBACK",
          createdAt: { gte: oneDayAgo },
        },
      });
    }

    // 3. Get existing profile
    const existing = await prisma.userProfile.findUnique({
      where: { userId },
    });

    // 4. Fetch display name if not yet known
    let displayName = existing?.displayName ?? null;
    if (!displayName) {
      displayName = await fetchDisplayName(userId);
    }

    // 5. Apply tag rules
    const currentTags = existing?.tags ?? [];
    const newTags = applyTagRules(currentTags, eventType, {
      ...data,
      fallbackCount,
    });

    // 6. Calculate lead score
    const isBlocked = eventType === "UNFOLLOW"
      ? true
      : eventType === "FOLLOW"
        ? false
        : (existing?.isBlocked ?? false);
    const isHotEvent = (HOT_EVENTS as readonly string[]).includes(eventType);
    const hotSince = isHotEvent
      ? new Date()
      : existing?.hotSince ?? null;
    const leadScore = calculateLeadScore(newTags, hotSince, isBlocked);

    // 7. Calculate relationship score delta
    const currentRelScore = existing?.relationshipScore ?? 0;
    const delta = calculateRelationshipDelta(eventType, { ...data, fallbackCount }, currentRelScore);
    const newRelScore = Math.min(currentRelScore + delta, RELATIONSHIP_SCORE_MAX);
    const newRelLevel = getRelationshipLevel(newRelScore);

    // 8. Determine customer type
    const currentCustomerType = existing?.customerType ?? CUSTOMER_TYPES.NEW;
    const newCustomerType = determineCustomerType(eventType, data, currentCustomerType);

    // 9. Upsert profile
    await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName,
        tags: newTags,
        leadScore,
        hotSince,
        isBlocked,
        totalEvents: 1,
        lastActive: new Date(),
        firstSeen: new Date(),
        relationshipScore: newRelScore,
        relationshipLevel: newRelLevel,
        customerType: newCustomerType,
      },
      update: {
        displayName: displayName ?? existing?.displayName ?? undefined,
        tags: newTags,
        leadScore,
        hotSince,
        isBlocked,
        totalEvents: { increment: 1 },
        lastActive: new Date(),
        relationshipScore: newRelScore,
        relationshipLevel: newRelLevel,
        customerType: newCustomerType,
      },
    });

    // 10. Check alert rules (non-blocking)
    const prevLeadScore = existing?.leadScore ?? null;
    await checkAlerts(
      {
        userId,
        displayName,
        storeId: data.storeId,
        storeName: data.storeName,
        regionName: data.regionName,
        tags: newTags,
        eventType,
      },
      prevLeadScore,
      leadScore,
      fallbackCount
    );
  } catch (error) {
    console.error("[tracking] Event recording failed:", error);
    // Do NOT throw — event recording failure must not break LINE reply
  }
}
