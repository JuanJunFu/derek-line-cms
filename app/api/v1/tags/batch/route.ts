import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/v1/tags/batch — batch add/remove tags
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check role: ADMIN or EDITOR only
  const role = (session.user as unknown as { role: string })?.role;
  if (!role || !["ADMIN", "EDITOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userIds, addTags, removeTags } = body as {
    userIds: string[];
    addTags?: string[];
    removeTags?: string[];
  };

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json(
      { error: "userIds array is required" },
      { status: 400 }
    );
  }

  let updated = 0;

  // Process each user
  for (const userId of userIds) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { tags: true },
    });
    if (!profile) continue;

    let tags = [...profile.tags];

    // Add tags (avoid duplicates)
    if (addTags && addTags.length > 0) {
      for (const tag of addTags) {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      }
    }

    // Remove tags
    if (removeTags && removeTags.length > 0) {
      tags = tags.filter((t) => !removeTags.includes(t));
    }

    await prisma.userProfile.update({
      where: { userId },
      data: { tags },
    });
    updated++;
  }

  return NextResponse.json({ updated });
}
