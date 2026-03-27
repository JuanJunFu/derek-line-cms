import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { HOT_DECAY_DAYS } from "@/lib/constants";
import { computeLiveScore, getQuadrant, type Quadrant } from "@/lib/lead-utils";

/**
 * GET /api/v1/leads — Paginated leads list with search, filter, sort.
 *
 * Query params:
 *   page     (default 1)
 *   limit    (default 20, max 100)
 *   q        (search displayName / userId)
 *   quadrant (hot_high | hot_low | cold_high | cold_low)
 *   sort     (lastActive | relationshipScore | totalEvents)
 *   order    (asc | desc, default desc)
 *   tag      (exact match in tags array)
 *   level    (relationshipLevel filter)
 *   type     (customerType: new | returning)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20")));
  const q = sp.get("q")?.trim() || undefined;
  const quadrant = sp.get("quadrant") as Quadrant | null;
  const sort = sp.get("sort") ?? "lastActive";
  const order = sp.get("order") === "asc" ? "asc" : "desc";
  const tag = sp.get("tag") || undefined;
  const level = sp.get("level") || undefined;
  const type = sp.get("type") || undefined;

  // ── Build Prisma where clause ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isBlocked: false };

  if (q) {
    where.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { userId: { contains: q, mode: "insensitive" } },
    ];
  }
  if (tag) {
    where.tags = { has: tag };
  }
  if (level) {
    where.relationshipLevel = level;
  }
  if (type) {
    where.customerType = type;
  }

  // Quadrant filtering requires combining leadScore + relationshipScore.
  // For HOT quadrants, we also need to account for HOT decay (90 days).
  if (quadrant) {
    const isHotQuadrant = quadrant === "hot_high" || quadrant === "hot_low";
    const isHighRel = quadrant === "hot_high" || quadrant === "cold_high";
    const hotCutoff = new Date(Date.now() - HOT_DECAY_DAYS * 24 * 60 * 60 * 1000);

    if (isHotQuadrant) {
      where.leadScore = "HOT";
      where.hotSince = { gte: hotCutoff };
    } else {
      // WARM/COLD or expired HOT
      where.OR = [
        ...(where.OR ?? []),
        { leadScore: { in: ["WARM", "COLD"] } },
        { leadScore: "HOT", hotSince: { lt: hotCutoff } },
        { leadScore: "HOT", hotSince: null },
      ];
      // If we already have an OR from search, we need to use AND
      if (q) {
        const searchOr = [
          { displayName: { contains: q, mode: "insensitive" } },
          { userId: { contains: q, mode: "insensitive" } },
        ];
        delete where.OR;
        where.AND = [
          { OR: searchOr },
          {
            OR: [
              { leadScore: { in: ["WARM", "COLD"] } },
              { leadScore: "HOT", hotSince: { lt: hotCutoff } },
              { leadScore: "HOT", hotSince: null },
            ],
          },
        ];
      }
    }

    if (isHighRel) {
      where.relationshipScore = { gte: 41 };
    } else {
      where.relationshipScore = { lt: 41 };
    }
  }

  // ── Validate sort field ──
  const validSorts = ["lastActive", "relationshipScore", "totalEvents"];
  const sortField = validSorts.includes(sort) ? sort : "lastActive";

  // ── Query with pagination ──
  const [profiles, total] = await Promise.all([
    prisma.userProfile.findMany({
      where,
      orderBy: { [sortField]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.userProfile.count({ where }),
  ]);

  // ── Compute quadrant counts (always, for the 4-card display) ──
  const now = Date.now();
  const hotCutoff = new Date(now - HOT_DECAY_DAYS * 24 * 60 * 60 * 1000);

  // Base where for counts (respect search/tag/level/type but NOT quadrant)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseWhere: any = { isBlocked: false };
  if (q) {
    baseWhere.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { userId: { contains: q, mode: "insensitive" } },
    ];
  }
  if (tag) baseWhere.tags = { has: tag };
  if (level) baseWhere.relationshipLevel = level;
  if (type) baseWhere.customerType = type;

  const [hotHighCount, hotLowCount, coldHighCount, coldLowCount] = await Promise.all([
    prisma.userProfile.count({
      where: { ...baseWhere, leadScore: "HOT", hotSince: { gte: hotCutoff }, relationshipScore: { gte: 41 } },
    }),
    prisma.userProfile.count({
      where: { ...baseWhere, leadScore: "HOT", hotSince: { gte: hotCutoff }, relationshipScore: { lt: 41 } },
    }),
    // cold_high = non-HOT + highRel (approximation: count all highRel minus hot_high)
    prisma.userProfile.count({
      where: { ...baseWhere, relationshipScore: { gte: 41 } },
    }).then((allHigh) => allHigh - 0), // will subtract hotHighCount below
    prisma.userProfile.count({
      where: { ...baseWhere, relationshipScore: { lt: 41 } },
    }).then((allLow) => allLow - 0),
  ]);

  const quadrantCounts = {
    hot_high: hotHighCount,
    hot_low: hotLowCount,
    cold_high: coldHighCount - hotHighCount,
    cold_low: coldLowCount - hotLowCount,
  };

  // ── Apply live score to results ──
  const data = profiles.map((p) => {
    const liveScore = computeLiveScore(p.leadScore, p.hotSince, p.tags, now);
    return {
      userId: p.userId,
      displayName: p.displayName,
      tags: p.tags,
      leadScore: p.leadScore,
      hotSince: p.hotSince?.toISOString() ?? null,
      lastActive: p.lastActive.toISOString(),
      firstSeen: p.firstSeen.toISOString(),
      totalEvents: p.totalEvents,
      relationshipScore: p.relationshipScore ?? 0,
      relationshipLevel: p.relationshipLevel ?? "新識",
      customerType: p.customerType ?? "new",
      liveScore,
      quadrant: getQuadrant(liveScore, p.relationshipScore ?? 0),
    };
  });

  return NextResponse.json({
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    quadrantCounts,
  });
}
