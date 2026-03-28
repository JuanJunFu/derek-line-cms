import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/v1/tags — get all unique tags with counts, grouped by prefix
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await prisma.userProfile.findMany({
    where: { isBlocked: false },
    select: { tags: true },
  });

  // Aggregate tag counts
  const tagCounts = new Map<string, number>();
  for (const profile of profiles) {
    for (const tag of profile.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  // Build result with group info
  const tags = Array.from(tagCounts.entries())
    .map(([tag, count]) => {
      const colonIdx = tag.indexOf(":");
      const group = colonIdx > 0 ? tag.substring(0, colonIdx) : "Custom";
      return { tag, count, group };
    })
    .sort((a, b) => {
      // Sort by group then by count desc
      if (a.group !== b.group) return a.group.localeCompare(b.group);
      return b.count - a.count;
    });

  return NextResponse.json({ tags });
}
