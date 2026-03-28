import { prisma } from "@/lib/prisma";
import { TagsClient } from "@/components/tags/TagsClient";

export const dynamic = "force-dynamic";

const GROUP_ORDER = ["Intent", "Region", "Status", "Role", "Custom"];

export default async function TagsPage() {
  // 1. Get tag definitions
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

  // 3. Merge definitions + user tags
  const tagMap = new Map<string, { tag: string; count: number; group: string }>();

  for (const def of definitions) {
    tagMap.set(def.tag, {
      tag: def.tag,
      count: tagCounts.get(def.tag) || 0,
      group: def.group,
    });
  }

  for (const [tag, count] of tagCounts) {
    if (!tagMap.has(tag)) {
      const colonIdx = tag.indexOf(":");
      const group = colonIdx > 0 ? tag.substring(0, colonIdx) : "Custom";
      tagMap.set(tag, { tag, count, group });
    }
  }

  const tags = Array.from(tagMap.values()).sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a.group);
    const bi = GROUP_ORDER.indexOf(b.group);
    const aIdx = ai === -1 ? 99 : ai;
    const bIdx = bi === -1 ? 99 : bi;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return b.count - a.count;
  });

  return <TagsClient initialTags={tags} />;
}
