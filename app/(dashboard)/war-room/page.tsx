import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AutoRefresh } from "@/components/ui/AutoRefresh";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, { icon: string; label: string; bg: string; text: string }> = {
  STORE_CALL: { icon: "📞", label: "致電門市", bg: "bg-red-900/40", text: "text-red-300" },
  STORE_NAV:  { icon: "🗺️", label: "導航前往", bg: "bg-orange-900/40", text: "text-orange-300" },
  STORE_LINE: { icon: "💬", label: "門市LINE", bg: "bg-amber-900/40", text: "text-amber-300" },
  FOLLOW:     { icon: "✅", label: "加入好友", bg: "bg-green-900/40", text: "text-green-300" },
  PRODUCT_VIEW: { icon: "🛁", label: "瀏覽產品", bg: "bg-blue-900/40", text: "text-blue-300" },
  REGION_SELECT: { icon: "📍", label: "選擇地區", bg: "bg-emerald-900/40", text: "text-emerald-300" },
  MESSAGE:    { icon: "💬", label: "傳送訊息", bg: "bg-purple-900/40", text: "text-purple-300" },
  POSTBACK:   { icon: "👆", label: "點擊按鈕", bg: "bg-indigo-900/40", text: "text-indigo-300" },
};

export default async function WarRoomPage() {
  const now = new Date();
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const h1ago  = new Date(now.getTime() - 60 * 60 * 1000);

  // HOT users sorted by lastActive
  const hotProfiles = await prisma.userProfile.findMany({
    where: { leadScore: "HOT", isBlocked: false },
    orderBy: { lastActive: "desc" },
    take: 20,
  });

  // Recent high-intent events (24h)
  const recentHighIntent = await prisma.userEvent.findMany({
    where: {
      eventType: { in: ["STORE_CALL", "STORE_NAV", "STORE_LINE"] },
      createdAt: { gte: h24ago },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // All recent events (1h) — live feed
  const liveFeed = await prisma.userEvent.findMany({
    where: { createdAt: { gte: h1ago } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Profile lookup for live feed
  const feedUserIds = [...new Set(liveFeed.map((e) => e.userId))];
  const feedProfiles = await prisma.userProfile.findMany({
    where: { userId: { in: feedUserIds } },
    select: { userId: true, displayName: true, leadScore: true, relationshipLevel: true },
  });
  const profileMap = Object.fromEntries(feedProfiles.map((p) => [p.userId, p]));

  // Stats
  const [totalHot, todayNewFollows, todayHighIntent] = await Promise.all([
    prisma.userProfile.count({ where: { leadScore: "HOT", isBlocked: false } }),
    prisma.userEvent.count({ where: { eventType: "FOLLOW", createdAt: { gte: (() => { const tw = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" })); const start = new Date(tw.getFullYear(), tw.getMonth(), tw.getDate()); start.setTime(start.getTime() - 8 * 60 * 60 * 1000); return start; })() } } }),
    prisma.userEvent.count({
      where: { eventType: { in: ["STORE_CALL", "STORE_NAV", "STORE_LINE"] }, createdAt: { gte: h24ago } },
    }),
  ]);

  return (
    <div>
      <AutoRefresh intervalMs={30000} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-100">🎯 意圖戰情室</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            即時 HOT 客戶監控 · 每 30 秒自動更新 ·{" "}
            最後更新：{now.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-400">Live</span>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{totalHot}</p>
          <p className="text-xs text-gray-500 mt-1">🔥 HOT 客戶</p>
        </div>
        <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{todayHighIntent}</p>
          <p className="text-xs text-gray-500 mt-1">⚡ 24h 高意圖行動</p>
        </div>
        <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{todayNewFollows}</p>
          <p className="text-xs text-gray-500 mt-1">✅ 今日新加好友</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ── Left: HOT Users ── */}
        <div>
          <h2 className="text-sm font-bold text-red-400 mb-3">
            🔥 HOT 客戶（{hotProfiles.length} 人）
          </h2>
          <div className="space-y-2">
            {hotProfiles.length === 0 ? (
              <p className="text-sm text-gray-500">目前無 HOT 客戶</p>
            ) : (
              hotProfiles.map((p) => (
                <Link
                  key={p.userId}
                  href={`/leads/${encodeURIComponent(p.userId)}`}
                  className="block bg-gray-900 border border-red-800/30 rounded-lg p-3 hover:border-red-700/50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-100 font-medium truncate">
                        {p.displayName || p.userId.slice(0, 16) + "…"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.customerType === "returning" && (
                          <span className="text-xs text-blue-400">🔄 老客戶</span>
                        )}
                        <span className="text-xs text-gray-500">
                          {p.tags.find((t) => t.startsWith("Region:"))?.replace("Region:", "地區：") ?? ""}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs text-amber-400">{p.relationshipLevel ?? "新識"}</p>
                      <p className="text-xs text-gray-600">{timeAgo(p.lastActive)}</p>
                    </div>
                  </div>
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.tags.filter((t) => t.startsWith("Intent:") || t === "Status:High_Purchase_Intent").slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-red-900/30 text-red-300">
                        {INTENT_ZH[tag] ?? tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* ── Right: Live Feed + High-Intent Events ── */}
        <div className="space-y-6">
          {/* High-intent events 24h */}
          <div>
            <h2 className="text-sm font-bold text-amber-400 mb-3">
              ⚡ 24h 高意圖行動（{recentHighIntent.length} 筆）
            </h2>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {recentHighIntent.length === 0 ? (
                <p className="text-sm text-gray-500">24 小時內無高意圖行動</p>
              ) : (
                recentHighIntent.map((e) => {
                  const ev = EVENT_LABELS[e.eventType];
                  const data = e.data as Record<string, any>;
                  return (
                    <Link
                      key={e.id}
                      href={`/leads/${encodeURIComponent(e.userId)}`}
                      className="flex items-center gap-2 bg-amber-950/30 border border-amber-800/20 rounded-lg px-3 py-2 hover:border-amber-700/40 transition"
                    >
                      <span className="text-sm">{ev?.icon ?? "⚡"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 truncate">
                          {e.userId.slice(0, 12)}…
                          {data.storeName ? ` → ${data.storeName}` : ""}
                        </p>
                        <p className={`text-xs ${ev?.text ?? "text-amber-300"}`}>{ev?.label ?? e.eventType}</p>
                      </div>
                      <span className="text-xs text-gray-600 shrink-0">{timeAgo(e.createdAt)}</span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Live feed (1h) */}
          <div>
            <h2 className="text-sm font-bold text-gray-400 mb-3">
              📡 即時動態（最近 1 小時，{liveFeed.length} 筆）
            </h2>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {liveFeed.length === 0 ? (
                <p className="text-sm text-gray-500">最近 1 小時無事件</p>
              ) : (
                liveFeed.map((e) => {
                  const ev = EVENT_LABELS[e.eventType];
                  const prof = profileMap[e.userId];
                  const isHot = prof?.leadScore === "HOT";
                  return (
                    <Link
                      key={e.id}
                      href={`/leads/${encodeURIComponent(e.userId)}`}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-800 transition ${
                        isHot ? "bg-red-950/30" : "bg-gray-900/50"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        ev?.bg.includes("red") ? "bg-red-500" :
                        ev?.bg.includes("amber") ? "bg-amber-500" :
                        ev?.bg.includes("green") ? "bg-green-500" :
                        ev?.bg.includes("blue") ? "bg-blue-500" :
                        "bg-gray-500"
                      }`} />
                      <span className="text-xs text-gray-400 flex-1 truncate">
                        {prof?.displayName || e.userId.slice(0, 10) + "…"}
                        <span className="text-gray-600"> · {ev?.label ?? e.eventType}</span>
                      </span>
                      {isHot && <span className="text-xs text-red-400">🔥</span>}
                      <span className="text-xs text-gray-700 shrink-0">{minutesAgo(e.createdAt)}</span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const INTENT_ZH: Record<string, string> = {
  "Intent:Comfort_High": "馬桶/免治",
  "Intent:SmartToilet_High": "智慧馬桶",
  "Intent:Storage_Space": "面盆/浴櫃",
  "Intent:Quick_Fix": "龍頭",
  "Intent:Luxury_Living": "浴缸",
  "Intent:Safety_Care": "無障礙",
  "Intent:Maintenance": "配件",
  "Status:High_Purchase_Intent": "高購買意圖",
};

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return date.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });
}

function minutesAgo(date: Date): string {
  const m = Math.floor((Date.now() - date.getTime()) / 60000);
  return m < 1 ? "剛剛" : `${m}m`;
}
