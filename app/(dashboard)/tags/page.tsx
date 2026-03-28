import { prisma } from "@/lib/prisma";
import { TagsClient } from "@/components/tags/TagsClient";

export const dynamic = "force-dynamic";

interface TagInfo {
  tag: string;
  count: number;
  group: string;
}

export default async function TagsPage() {
  // Aggregate tags server-side for initial render
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

  const tags: TagInfo[] = Array.from(tagCounts.entries())
    .map(([tag, count]) => {
      const colonIdx = tag.indexOf(":");
      const group = colonIdx > 0 ? tag.substring(0, colonIdx) : "Custom";
      return { tag, count, group };
    })
    .sort((a, b) => {
      if (a.group !== b.group) return a.group.localeCompare(b.group);
      return b.count - a.count;
    });

  return <TagsClient initialTags={tags} />;
}
