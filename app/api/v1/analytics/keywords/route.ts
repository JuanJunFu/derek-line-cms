import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Chinese stop words to filter out
const STOP_WORDS = new Set([
  "的", "了", "是", "我", "你", "他", "她", "它", "我們", "你們", "他們",
  "這", "那", "有", "在", "和", "與", "或", "但", "也", "都", "還",
  "就", "很", "不", "沒", "要", "會", "可以", "什麼", "怎麼", "為什麼",
  "嗎", "嗯", "哦", "啊", "喔", "呢", "吧", "嗨", "哈", "OK", "ok",
  "ㄟ", "欸", "哇", "唷", "囉", "ㄚ", "ㄛ", "ㄜ",
]);

/** GET /api/v1/analytics/keywords?days=30&limit=50 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days  = Math.min(90, Math.max(1, parseInt(searchParams.get("days") ?? "30")));
  const limit = Math.min(100, Math.max(5, parseInt(searchParams.get("limit") ?? "50")));

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Fetch FALLBACK events with keyword data
  const fallbackEvents = await prisma.userEvent.findMany({
    where: { eventType: "FALLBACK", createdAt: { gte: since } },
    select: { data: true, createdAt: true },
    take: 2000,
  });

  // Fetch MESSAGE events (non-matched auto-replies)
  const messageEvents = await prisma.userEvent.findMany({
    where: { eventType: "MESSAGE", createdAt: { gte: since } },
    select: { data: true },
    take: 2000,
  });

  // Count keyword frequency
  const freq: Record<string, number> = {};

  function addKeyword(kw: unknown) {
    if (typeof kw !== "string" || !kw.trim()) return;
    const word = kw.trim().replace(/[！!？?。，、,\.。…]+/g, "").slice(0, 30);
    if (!word || word.length < 2) return;
    if (STOP_WORDS.has(word)) return;
    freq[word] = (freq[word] ?? 0) + 1;
  }

  for (const e of fallbackEvents) {
    addKeyword((e.data as Record<string, unknown>)?.keyword);
  }
  for (const e of messageEvents) {
    addKeyword((e.data as Record<string, unknown>)?.keyword);
  }

  // Sort by frequency
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));

  // Co-occurrence: for top 10 keywords, find what tags their users have
  const topWords = sorted.slice(0, 10).map((w) => w.word);
  const coTags: Record<string, Record<string, number>> = {};

  if (topWords.length > 0) {
    // Find userIds for each top keyword
    for (const word of topWords) {
      const events = await prisma.userEvent.findMany({
        where: {
          eventType: { in: ["FALLBACK", "MESSAGE"] },
          createdAt: { gte: since },
          data: { path: ["keyword"], equals: word },
        },
        select: { userId: true },
        take: 100,
      });
      const userIds = [...new Set(events.map((e) => e.userId))];
      if (userIds.length === 0) continue;

      const profiles = await prisma.userProfile.findMany({
        where: { userId: { in: userIds } },
        select: { tags: true },
      });

      const tagCounts: Record<string, number> = {};
      for (const p of profiles) {
        for (const tag of p.tags) {
          tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
        }
      }
      coTags[word] = tagCounts;
    }
  }

  return NextResponse.json({
    keywords: sorted,
    coTags,
    totalFallbacks: fallbackEvents.length,
    days,
  });
}
