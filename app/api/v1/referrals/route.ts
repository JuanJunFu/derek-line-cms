import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET /api/v1/referrals — Paginated referral list with stats.
 *
 * Query params:
 *   page   (default 1)
 *   limit  (default 20, max 100)
 *   status (PENDING | COMPLETED | all, default all)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 20));
  const status = sp.get("status") || "all";

  const where = status !== "all" ? { status: status as "PENDING" | "COMPLETED" } : {};

  const [referrals, total, completedCount, pendingCount] = await Promise.all([
    prisma.referral.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.referral.count({ where }),
    prisma.referral.count({ where: { status: "COMPLETED" } }),
    prisma.referral.count({ where: { status: "PENDING" } }),
  ]);

  // Collect all user IDs for profile lookup
  const userIds = [
    ...new Set(
      referrals.flatMap((r) => [r.referrerUserId, r.refereeUserId].filter(Boolean) as string[])
    ),
  ];

  const profiles = await prisma.userProfile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, displayName: true, customerType: true, relationshipLevel: true },
  });
  const profileMap = Object.fromEntries(profiles.map((p) => [p.userId, p]));

  const data = referrals.map((r) => ({
    id: r.id,
    code: r.code,
    status: r.status,
    createdAt: r.createdAt,
    completedAt: r.completedAt,
    referrer: {
      userId: r.referrerUserId,
      displayName: profileMap[r.referrerUserId]?.displayName ?? null,
    },
    referee: r.refereeUserId
      ? {
          userId: r.refereeUserId,
          displayName: profileMap[r.refereeUserId]?.displayName ?? null,
        }
      : null,
  }));

  return NextResponse.json({
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    stats: { completed: completedCount, pending: pendingCount },
  });
}
