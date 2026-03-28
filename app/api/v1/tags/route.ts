import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/v1/tags — get all tags: merge TagDefinition + actual user tag counts
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Get all tag definitions
  const definitions = await prisma.tagDefinition.findMany({
    orderBy: { createdAt: "asc" },
  });

  // 2. Get actual user tag counts
  const profiles = await prisma.userProfile.findMany({
    where: { isBlocked: false },
    select: { tags: true },
  });

  const tagCounts = new Map<string, number>();
  for (const profile of profiles) {
    for (const tag of profile.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  // 3. Merge: definitions + any user tags not in definitions
  const tagMap = new Map<string, { tag: string; count: number; group: string; label: string | null }>();

  // Add all definitions first
  for (const def of definitions) {
    tagMap.set(def.tag, {
      tag: def.tag,
      count: tagCounts.get(def.tag) || 0,
      group: def.group,
      label: def.label,
    });
  }

  // Add any user tags not in definitions
  for (const [tag, count] of tagCounts) {
    if (!tagMap.has(tag)) {
      const colonIdx = tag.indexOf(":");
      const group = colonIdx > 0 ? tag.substring(0, colonIdx) : "Custom";
      tagMap.set(tag, { tag, count, group, label: null });
    }
  }

  // Sort by group then by count desc
  const GROUP_ORDER = ["Intent", "Region", "Status", "Role", "Custom"];
  const tags = Array.from(tagMap.values()).sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a.group);
    const bi = GROUP_ORDER.indexOf(b.group);
    const aIdx = ai === -1 ? 99 : ai;
    const bIdx = bi === -1 ? 99 : bi;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return b.count - a.count;
  });

  return NextResponse.json({ tags });
}

// POST /api/v1/tags — create a new tag definition
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, group } = body as { name: string; group: string };

  if (!name?.trim() || !group?.trim()) {
    return NextResponse.json({ error: "名稱和群組為必填" }, { status: 400 });
  }

  const validGroups = ["Intent", "Region", "Status", "Role", "Custom"];
  if (!validGroups.includes(group)) {
    return NextResponse.json({ error: "無效的群組" }, { status: 400 });
  }

  const tag = `${group}:${name.trim()}`;

  // Check if already exists
  const existing = await prisma.tagDefinition.findUnique({ where: { tag } });
  if (existing) {
    return NextResponse.json({ error: "此標籤已存在" }, { status: 409 });
  }

  const created = await prisma.tagDefinition.create({
    data: { tag, group, label: name.trim() },
  });

  return NextResponse.json({ success: true, tagDefinition: created });
}
