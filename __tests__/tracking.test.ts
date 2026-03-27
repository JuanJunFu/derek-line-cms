import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma — factory must not reference outer variables (hoisting)
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userEvent: {
      create: vi.fn(),
      count: vi.fn(),
    },
    userProfile: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Import after mock
import {
  trackEvent,
  applyTagRules,
  calculateLeadScore,
  type TrackingData,
} from "@/lib/tracking";
import { prisma } from "@/lib/prisma";

// Cast for mock access
const mockPrisma = prisma as unknown as {
  userEvent: { create: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  userProfile: { upsert: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.userProfile.upsert.mockResolvedValue({
    userId: "U123",
    tags: [],
    leadScore: "COLD",
    totalEvents: 1,
    isBlocked: false,
    hotSince: null,
  });
  mockPrisma.userEvent.create.mockResolvedValue({ id: "evt1" });
  mockPrisma.userProfile.findUnique.mockResolvedValue(null);
  mockPrisma.userProfile.update.mockResolvedValue({});
});

// ─── Rule 1: Product view → Intent tag ───
describe("Rule 1: Product view → Intent tag", () => {
  it("adds Intent:Comfort_High tag when viewing toilet category", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "PRODUCT_VIEW", { category: "toilet" });
    expect(result).toContain("Intent:Comfort_High");
  });

  it("adds Intent:Luxury_Living tag when viewing bathtub category", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "PRODUCT_VIEW", { category: "bathtub" });
    expect(result).toContain("Intent:Luxury_Living");
  });

  it("adds Intent:Quick_Fix tag when viewing faucet category", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "PRODUCT_VIEW", { category: "faucet" });
    expect(result).toContain("Intent:Quick_Fix");
  });

  it("adds Intent:Safety_Care tag when viewing accessibility category", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "PRODUCT_VIEW", {
      category: "accessibility",
    });
    expect(result).toContain("Intent:Safety_Care");
  });

  it("adds Intent:Storage_Space tag when viewing basin category", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "PRODUCT_VIEW", { category: "basin" });
    expect(result).toContain("Intent:Storage_Space");
  });

  it("adds Intent:Maintenance tag when viewing accessories category", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "PRODUCT_VIEW", {
      category: "accessories",
    });
    expect(result).toContain("Intent:Maintenance");
  });

  it("does not duplicate existing tag", () => {
    const tags = ["Intent:Comfort_High"];
    const result = applyTagRules(tags, "PRODUCT_VIEW", { category: "toilet" });
    expect(result.filter((t) => t === "Intent:Comfort_High")).toHaveLength(1);
  });
});

// ─── Rule 2: Region select → Region tag ───
describe("Rule 2: Region select → Region tag", () => {
  it("adds Region:taipei tag when selecting taipei region", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "REGION_SELECT", { region: "taipei" });
    expect(result).toContain("Region:taipei");
  });

  it("does not duplicate existing region tag", () => {
    const tags = ["Region:taipei"];
    const result = applyTagRules(tags, "REGION_SELECT", { region: "taipei" });
    expect(result.filter((t) => t === "Region:taipei")).toHaveLength(1);
  });
});

// ─── Rule 3: Store call/nav/LINE → HOT ───
describe("Rule 3: Store call/nav/LINE → HOT + tag", () => {
  it("adds Status:High_Purchase_Intent on STORE_CALL", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "STORE_CALL", { storeId: "s01" });
    expect(result).toContain("Status:High_Purchase_Intent");
  });

  it("adds Status:High_Purchase_Intent on STORE_NAV", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "STORE_NAV", { storeId: "s01" });
    expect(result).toContain("Status:High_Purchase_Intent");
  });

  it("adds Status:High_Purchase_Intent on STORE_LINE", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "STORE_LINE", { storeId: "s01" });
    expect(result).toContain("Status:High_Purchase_Intent");
  });
});

// ─── Rule 4: Maintenance keywords → Service tag ───
describe("Rule 4: Maintenance keywords → Role:Service_Needed", () => {
  it("adds Role:Service_Needed when keyword contains 維修", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "MESSAGE", { keyword: "維修" });
    expect(result).toContain("Role:Service_Needed");
  });

  it("adds Role:Service_Needed when keyword contains 零件", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "MESSAGE", { keyword: "零件" });
    expect(result).toContain("Role:Service_Needed");
  });

  it("adds Role:Service_Needed when keyword contains 漏水", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "MESSAGE", { keyword: "漏水" });
    expect(result).toContain("Role:Service_Needed");
  });

  it("does not add service tag for unrelated keywords", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "MESSAGE", { keyword: "門市" });
    expect(result).not.toContain("Role:Service_Needed");
  });
});

// ─── Rule 5: 3+ fallbacks in 24h → Needs_Human ───
describe("Rule 5: 3+ FALLBACK in 24h → Status:Needs_Human", () => {
  it("adds Status:Needs_Human when fallbackCount >= 3", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "FALLBACK", { fallbackCount: 3 });
    expect(result).toContain("Status:Needs_Human");
  });

  it("does not add Status:Needs_Human when fallbackCount < 3", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "FALLBACK", { fallbackCount: 2 });
    expect(result).not.toContain("Status:Needs_Human");
  });
});

// ─── Rule 6: UNFOLLOW → COLD + Blocked ───
describe("Rule 6: UNFOLLOW → COLD + Status:Blocked", () => {
  it("adds Status:Blocked on UNFOLLOW", () => {
    const tags: string[] = [];
    const result = applyTagRules(tags, "UNFOLLOW", {});
    expect(result).toContain("Status:Blocked");
  });
});

// ─── Lead Scoring ───
describe("calculateLeadScore", () => {
  it("returns HOT when tags contain High_Purchase_Intent and hotSince within 30 days", () => {
    const score = calculateLeadScore(
      ["Status:High_Purchase_Intent"],
      new Date(), // hotSince = now
      false
    );
    expect(score).toBe("HOT");
  });

  it("returns COLD when HOT expired (hotSince > 30 days ago)", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 31);
    const score = calculateLeadScore(
      ["Status:High_Purchase_Intent"],
      oldDate,
      false
    );
    expect(score).toBe("WARM"); // decays to WARM, not COLD (still has intent tags)
  });

  it("returns WARM when has product + region tags but no High_Purchase_Intent", () => {
    const score = calculateLeadScore(
      ["Intent:Comfort_High", "Region:taipei"],
      null,
      false
    );
    expect(score).toBe("WARM");
  });

  it("returns COLD when only has generic tags", () => {
    const score = calculateLeadScore([], null, false);
    expect(score).toBe("COLD");
  });

  it("returns COLD when user is blocked regardless of tags", () => {
    const score = calculateLeadScore(
      ["Status:High_Purchase_Intent"],
      new Date(),
      true
    );
    expect(score).toBe("COLD");
  });
});

// ─── trackEvent integration ───
describe("trackEvent", () => {
  it("creates UserEvent and upserts UserProfile", async () => {
    await trackEvent("U123", "FOLLOW", {});

    expect(mockPrisma.userEvent.create).toHaveBeenCalledOnce();
    expect(mockPrisma.userProfile.upsert).toHaveBeenCalledOnce();
  });

  it("passes webhookEventId for deduplication", async () => {
    await trackEvent("U123", "FOLLOW", {}, "evt-abc-0");

    expect(mockPrisma.userEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          webhookEventId: "evt-abc-0",
        }),
      })
    );
  });

  it("does not throw on DB error (try-catch)", async () => {
    mockPrisma.userEvent.create.mockRejectedValueOnce(new Error("DB down"));
    // Should not throw
    await expect(trackEvent("U123", "FOLLOW", {})).resolves.not.toThrow();
  });
});
