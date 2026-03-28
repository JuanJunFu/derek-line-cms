import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StoreToggle } from "@/components/stores/StoreToggle";

const TYPE_LABEL: Record<string, { label: string; bg: string; color: string }> =
  {
    FLAGSHIP: { label: "旗艦門市", bg: "#1a1a1a", color: "#B89A6A" },
    BRANCH: { label: "分公司", bg: "#2B4C7E", color: "#fff" },
    DEALER: { label: "授權經銷商", bg: "#9E9E9E", color: "#fff" },
    GENERAL: { label: "總經銷", bg: "#4E7C5F", color: "#fff" },
  };

const INTENT_ZH: Record<string, string> = {
  "Intent:Comfort_High": "馬桶/免治",
  "Intent:Storage_Space": "浴櫃/面盆",
  "Intent:Quick_Fix": "龍頭",
  "Intent:Luxury_Living": "浴缸",
  "Intent:Safety_Care": "無障礙",
  "Intent:Maintenance": "配件/維修",
};

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date();
  monthStart.setDate(monthStart.getDate() - 30);

  const [stores, storeEvents, totalNavClicks, hotProfiles, topIntents] =
    await Promise.all([
      prisma.store.findMany({
        include: { region: true },
        orderBy: [{ region: { order: "asc" } }, { order: "asc" }],
      }),
      // Per-store event counts (last 7 days)
      prisma.userEvent.groupBy({
        by: ["storeId", "eventType"],
        where: {
          storeId: { not: null },
          createdAt: { gte: weekStart },
        },
        _count: true,
      }),
      // Total nav clicks this month
      prisma.userEvent.count({
        where: {
          eventType: { in: ["STORE_NAV", "STORE_CALL", "STORE_LINE"] },
          createdAt: { gte: monthStart },
        },
      }),
      // Hot profiles count
      prisma.userProfile.count({
        where: { leadScore: "HOT", isBlocked: false },
      }),
      // Top intent tags across all profiles
      prisma.userProfile.findMany({
        where: { isBlocked: false },
        select: { tags: true },
      }),
    ]);

  // Calculate total store views for conversion rate
  const totalViews = await prisma.userEvent.count({
    where: {
      eventType: "STORE_VIEW",
      createdAt: { gte: monthStart },
    },
  });
  const conversionRate = totalViews > 0 ? Math.round((totalNavClicks / totalViews) * 100 * 10) / 10 : 0;

  // Calculate top intent distribution
  const intentCounts: Record<string, number> = {};
  for (const p of topIntents) {
    for (const tag of p.tags) {
      if (tag.startsWith("Intent:")) {
        intentCounts[tag] = (intentCounts[tag] ?? 0) + 1;
      }
    }
  }
  const topIntent = Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0];
  const totalIntentUsers = Object.values(intentCounts).reduce((s, v) => s + v, 0);
  const topIntentPct = totalIntentUsers > 0 && topIntent
    ? Math.round((topIntent[1] / totalIntentUsers) * 100)
    : 0;

  // Build per-store metrics
  const storeMetrics = new Map<string, { views: number; calls: number; navs: number; lines: number }>();
  for (const ev of storeEvents) {
    if (!ev.storeId) continue;
    const m = storeMetrics.get(ev.storeId) ?? { views: 0, calls: 0, navs: 0, lines: 0 };
    if (ev.eventType === "STORE_VIEW") m.views += ev._count;
    if (ev.eventType === "STORE_CALL") m.calls += ev._count;
    if (ev.eventType === "STORE_NAV") m.navs += ev._count;
    if (ev.eventType === "STORE_LINE") m.lines += ev._count;
    storeMetrics.set(ev.storeId, m);
  }

  // Find top affinity per store (most common intent tag among users who viewed this store)
  // Simplified: use region-level intent data
  const regionIntents = await prisma.userEvent.groupBy({
    by: ["region", "category"],
    where: {
      eventType: "PRODUCT_VIEW",
      category: { not: null },
      region: { not: null },
      createdAt: { gte: monthStart },
    },
    _count: true,
    orderBy: { _count: { category: "desc" } },
  });

  const regionTopCategory = new Map<string, string>();
  for (const ri of regionIntents) {
    if (ri.region && !regionTopCategory.has(ri.region)) {
      const catNames: Record<string, string> = {
        toilet: "馬桶/免治", bidet: "免治馬桶座", basin: "浴櫃/面盆",
        faucet: "龍頭", bathtub: "浴缸", accessibility: "無障礙",
        accessories: "配件", urinal: "小便斗", commercial: "公共空間",
      };
      regionTopCategory.set(ri.region, catNames[ri.category!] ?? ri.category!);
    }
  }

  // Find fastest growing region this week vs last week
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const [thisWeekRegions, lastWeekRegions] = await Promise.all([
    prisma.userEvent.groupBy({
      by: ["region"],
      where: { eventType: "REGION_SELECT", region: { not: null }, createdAt: { gte: weekStart } },
      _count: true,
    }),
    prisma.userEvent.groupBy({
      by: ["region"],
      where: { eventType: "REGION_SELECT", region: { not: null }, createdAt: { gte: lastWeekStart, lt: weekStart } },
      _count: true,
    }),
  ]);

  const regionNames: Record<string, string> = {
    taipei: "大台北", hsinchu: "竹苗", taichung: "台中",
    tainan: "台南", kaohsiung: "高雄",
  };

  let hotRegion = "—";
  let hotRegionGrowth = 0;
  for (const tw of thisWeekRegions) {
    const lw = lastWeekRegions.find((l) => l.region === tw.region);
    const lwCount = lw?._count ?? 0;
    const growth = lwCount > 0 ? Math.round(((tw._count - lwCount) / lwCount) * 100) : (tw._count > 0 ? 100 : 0);
    if (growth > hotRegionGrowth) {
      hotRegionGrowth = growth;
      hotRegion = regionNames[tw.region!] ?? tw.region!;
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">🏪 門市管理</h1>
        <Link
          href="/stores/new"
          className="bg-[var(--brand-primary)] hover:bg-[var(--text-secondary)] text-white px-4 py-2 rounded-lg text-sm font-bold transition"
        >
          ＋ 新增門市
        </Link>
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-6">
        管理各門市資訊（地址、電話、營業時間），並追蹤客戶對門市的致電、導航等互動數據。
      </p>

      {/* ── 意圖情報摘要卡 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4">
          <p className="text-xs text-[var(--text-muted)]">本月意向轉化率</p>
          <p className="text-2xl font-bold text-[var(--brand-accent)]">{conversionRate}%</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">導航+致電 / 門市查看</p>
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4">
          <p className="text-xs text-[var(--text-muted)]">本週熱門區域</p>
          <p className="text-2xl font-bold text-emerald-600">{hotRegion}</p>
          {hotRegionGrowth > 0 && (
            <p className="text-xs text-emerald-600 mt-1">↗ 成長 {hotRegionGrowth}%</p>
          )}
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4">
          <p className="text-xs text-[var(--text-muted)]">熱門意圖分佈</p>
          <p className="text-lg font-bold text-blue-600">
            {topIntent ? (INTENT_ZH[topIntent[0]] ?? topIntent[0]) : "—"}
          </p>
          {topIntent && (
            <p className="text-xs text-blue-600 mt-1">佔全部意圖 {topIntentPct}%</p>
          )}
        </div>
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4">
          <p className="text-xs text-[var(--text-muted)]">熱線索數量</p>
          <p className="text-2xl font-bold text-red-600">{hotProfiles}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">30 天內高購買意圖</p>
        </div>
      </div>

      {/* ── 門市表格（含動態指標） ── */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-[var(--bg-tertiary)] text-[var(--brand-accent)]">
              <th className="p-3 text-left font-medium">門市名稱</th>
              <th className="p-3 text-left font-medium">類型</th>
              <th className="p-3 text-left font-medium">地區</th>
              <th className="p-3 text-right font-medium">意向轉化 (7D)</th>
              <th className="p-3 text-left font-medium">熱門關聯</th>
              <th className="p-3 text-left font-medium">狀態</th>
              <th className="p-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => {
              const cfg = TYPE_LABEL[s.type];
              const m = storeMetrics.get(s.id) ?? { views: 0, calls: 0, navs: 0, lines: 0 };
              const totalActions = m.calls + m.navs + m.lines;
              const rate = m.views > 0 ? Math.round((totalActions / m.views) * 100 * 10) / 10 : 0;
              const regionSlug = s.region?.slug;
              const affinity = regionSlug ? regionTopCategory.get(regionSlug) : null;

              // Anomaly: high views but zero actions
              const hasAnomaly = m.views >= 3 && totalActions === 0;

              return (
                <tr
                  key={s.id}
                  className="border-t border-[var(--border-strong)] hover:bg-[var(--bg-tertiary)]/50 transition"
                >
                  <td className="p-3">
                    <p className="font-medium text-[var(--text-primary)]">{s.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{s.phone}</p>
                  </td>
                  <td className="p-3">
                    <span
                      style={{ background: cfg?.bg, color: cfg?.color }}
                      className="text-xs px-2 py-0.5 rounded font-bold inline-block"
                    >
                      {cfg?.label}
                    </span>
                  </td>
                  <td className="p-3 text-[var(--text-secondary)]">{s.region?.name}</td>
                  <td className="p-3 text-right">
                    <span
                      className={`font-bold ${
                        rate >= 10
                          ? "text-emerald-600"
                          : rate >= 5
                            ? "text-[var(--brand-accent)]"
                            : rate > 0
                              ? "text-[var(--text-secondary)]"
                              : "text-[var(--text-muted)]"
                      }`}
                    >
                      {rate > 0 ? `${rate}%` : "—"}
                    </span>
                    {rate >= 10 && (
                      <span className="text-xs text-emerald-700 ml-1">(極高)</span>
                    )}
                    {hasAnomaly && (
                      <span className="text-xs text-red-600 ml-1" title="高查看但零行動">⚠️</span>
                    )}
                  </td>
                  <td className="p-3">
                    {affinity ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                        {affinity}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    <StoreToggle storeId={s.id} isActive={s.isActive} />
                  </td>
                  <td className="p-3 flex gap-2">
                    <Link
                      href={`/stores/${s.id}`}
                      className="text-[var(--brand-accent)] hover:text-[var(--brand-accent)] font-medium text-xs"
                    >
                      編輯
                    </Link>
                    <Link
                      href="/analytics/stores"
                      className="text-blue-600 hover:text-blue-600 text-xs"
                    >
                      趨勢
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
