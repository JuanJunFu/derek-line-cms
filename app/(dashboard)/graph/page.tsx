import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TAG_ZH: Record<string, string> = {
  "Intent:Comfort_High":      "🚽 馬桶/免治",
  "Intent:SmartToilet_High":  "🧠 智慧馬桶",
  "Intent:Storage_Space":     "🪣 面盆/浴櫃",
  "Intent:Quick_Fix":         "🚿 龍頭更換",
  "Intent:Luxury_Living":     "🛁 浴缸",
  "Intent:Safety_Care":       "♿ 無障礙",
  "Intent:Maintenance":       "🔧 配件",
  "Region:taipei":            "📍 大台北",
  "Region:hsinchu":           "📍 竹苗",
  "Region:taichung":          "📍 台中",
  "Region:tainan":            "📍 台南",
  "Region:kaohsiung":         "📍 高雄",
  "Status:High_Purchase_Intent": "⚡ 高購買意圖",
  "Role:Service_Needed":      "🔧 維修需求",
};

const TAG_COLOR: Record<string, string> = {
  "Intent:": "bg-blue-900/40 text-blue-300 border-blue-700/40",
  "Region:": "bg-green-900/40 text-green-300 border-green-700/40",
  "Status:": "bg-red-900/40 text-red-300 border-red-700/40",
  "Role:":   "bg-yellow-900/40 text-yellow-300 border-yellow-700/40",
};

function tagColor(tag: string) {
  for (const [prefix, cls] of Object.entries(TAG_COLOR)) {
    if (tag.startsWith(prefix)) return cls;
  }
  return "bg-gray-800 text-gray-400 border-gray-700";
}

const REL_COLORS: Record<string, string> = {
  "新識": "border-l-gray-600",
  "認識": "border-l-blue-600",
  "熟識": "border-l-emerald-600",
  "信任": "border-l-amber-500",
  "忠誠": "border-l-orange-500",
};

export default async function GraphPage() {
  // Top 200 users by RelationshipScore
  const profiles = await prisma.userProfile.findMany({
    where: { isBlocked: false },
    orderBy: { relationshipScore: "desc" },
    take: 200,
    select: {
      userId: true,
      displayName: true,
      tags: true,
      leadScore: true,
      relationshipScore: true,
      relationshipLevel: true,
      totalEvents: true,
      lastActive: true,
      customerType: true,
    },
  });

  // ── Tag nodes: collect all unique tags and how many users have each ──
  const tagUserMap: Record<string, { userIds: string[]; label: string }> = {};
  for (const p of profiles) {
    for (const tag of p.tags) {
      if (!tagUserMap[tag]) tagUserMap[tag] = { userIds: [], label: TAG_ZH[tag] ?? tag };
      tagUserMap[tag].userIds.push(p.userId);
    }
  }

  // Sort tags by user count
  const tagNodes = Object.entries(tagUserMap)
    .sort((a, b) => b[1].userIds.length - a[1].userIds.length)
    .slice(0, 16);

  // Group users by primary tag (first intent tag, or first region tag)
  const groups: Record<string, typeof profiles> = {};
  for (const p of profiles) {
    const primaryTag =
      p.tags.find((t) => t.startsWith("Intent:")) ??
      p.tags.find((t) => t.startsWith("Region:")) ??
      p.tags.find((t) => t.startsWith("Status:")) ??
      "uncategorized";
    if (!groups[primaryTag]) groups[primaryTag] = [];
    groups[primaryTag].push(p);
  }

  const sortedGroups = Object.entries(groups)
    .sort((a, b) => b[1].length - a[1].length);

  // ── Store interaction summary ──
  const storeEvents = await prisma.userEvent.groupBy({
    by: ["storeId"],
    where: {
      eventType: { in: ["STORE_CALL", "STORE_NAV", "STORE_LINE"] },
      storeId: { not: null },
    },
    _count: true,
    orderBy: { _count: { storeId: "desc" } },
    take: 10,
  });

  const storeIds = storeEvents.map((s) => s.storeId!);
  const stores = await prisma.store.findMany({
    where: { id: { in: storeIds } },
    select: { id: true, name: true },
  });
  const storeNameMap = Object.fromEntries(stores.map((s) => [s.id, s.name]));

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-100 mb-1">🕸️ 客戶關係圖</h1>
      <p className="text-xs text-gray-500 mb-6">
        Top 200 客戶（依關係分排序）× 意圖標籤 × 地區分佈
      </p>

      <div className="grid grid-cols-3 gap-6">
        {/* ── Left: Tag nodes with user count ── */}
        <div className="col-span-1 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="text-xs font-bold text-gray-400 mb-3">🏷️ 標籤節點（用戶數）</h2>
            <div className="space-y-1.5">
              {tagNodes.map(([tag, { userIds, label }]) => {
                const pct = Math.round((userIds.length / profiles.length) * 100);
                return (
                  <div key={tag}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${tagColor(tag)}`}>
                        {label}
                      </span>
                      <span className="text-xs text-gray-500">{userIds.length} 人 ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1">
                      <div
                        className="h-1 rounded-full bg-amber-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Store interaction nodes */}
          {storeEvents.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h2 className="text-xs font-bold text-gray-400 mb-3">🏪 門市互動節點</h2>
              <div className="space-y-1.5">
                {storeEvents.map((s) => (
                  <div key={s.storeId} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 truncate max-w-[120px]">
                      {storeNameMap[s.storeId!] ?? s.storeId}
                    </span>
                    <span className="text-amber-400 font-mono">{s._count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Center + Right: User clusters grouped by primary tag ── */}
        <div className="col-span-2 space-y-4">
          {sortedGroups.map(([tag, users]) => (
            <div key={tag} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded border ${tagColor(tag)}`}>
                    {TAG_ZH[tag] ?? (tag === "uncategorized" ? "未分類" : tag)}
                  </span>
                  <span className="text-xs text-gray-500">{users.length} 人</span>
                </div>
                <RelLevelBar users={users} />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {users.slice(0, 8).map((u) => (
                  <Link
                    key={u.userId}
                    href={`/leads/${encodeURIComponent(u.userId)}`}
                    className={`flex items-center justify-between bg-gray-800/50 rounded-lg px-2 py-1.5 border-l-2 hover:bg-gray-800 transition ${REL_COLORS[u.relationshipLevel ?? "新識"] ?? "border-l-gray-700"}`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-gray-200 truncate">
                        {u.displayName || u.userId.slice(0, 12) + "…"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {u.relationshipLevel ?? "新識"} · {u.relationshipScore ?? 0}分
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {u.leadScore === "HOT" && <span className="text-xs">🔥</span>}
                      {u.customerType === "returning" && <span className="text-xs">🔄</span>}
                    </div>
                  </Link>
                ))}
                {users.length > 8 && (
                  <div className="flex items-center justify-center bg-gray-800/30 rounded-lg px-2 py-1.5 border border-gray-700/30">
                    <span className="text-xs text-gray-600">+{users.length - 8} 人</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Relationship level mini bar ──
function RelLevelBar({
  users,
}: {
  users: { relationshipLevel: string | null }[];
}) {
  const levels = ["新識", "認識", "熟識", "信任", "忠誠"];
  const colors  = ["bg-gray-600", "bg-blue-600", "bg-emerald-600", "bg-amber-500", "bg-orange-500"];
  const counts  = levels.map((lv) => users.filter((u) => (u.relationshipLevel ?? "新識") === lv).length);
  const total   = users.length;

  return (
    <div className="flex items-center gap-1">
      {levels.map((lv, i) => {
        const pct = total > 0 ? (counts[i] / total) * 100 : 0;
        if (pct < 1) return null;
        return (
          <div key={lv} title={`${lv}: ${counts[i]}`} className="flex items-center gap-0.5">
            <div className={`w-2 h-2 rounded-full ${colors[i]}`} />
            <span className="text-xs text-gray-600">{counts[i]}</span>
          </div>
        );
      })}
    </div>
  );
}
