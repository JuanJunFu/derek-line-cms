import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StoreAnalyticsPage() {
  const monthStart = new Date();
  monthStart.setDate(monthStart.getDate() - 30);

  // Get all active stores
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    include: { region: true },
    orderBy: { order: "asc" },
  });

  // Get event counts per store for the last 30 days
  const storeEvents = await prisma.userEvent.groupBy({
    by: ["storeId", "eventType"],
    where: {
      storeId: { not: null },
      createdAt: { gte: monthStart },
    },
    _count: true,
  });

  // Build store metrics map
  const metricsMap = new Map<
    string,
    { views: number; calls: number; navs: number; lines: number }
  >();

  for (const ev of storeEvents) {
    if (!ev.storeId) continue;
    const m = metricsMap.get(ev.storeId) ?? {
      views: 0,
      calls: 0,
      navs: 0,
      lines: 0,
    };
    if (ev.eventType === "STORE_VIEW") m.views += ev._count;
    if (ev.eventType === "STORE_CALL") m.calls += ev._count;
    if (ev.eventType === "STORE_NAV") m.navs += ev._count;
    if (ev.eventType === "STORE_LINE") m.lines += ev._count;
    metricsMap.set(ev.storeId, m);
  }

  // Sort stores by total actions (calls + navs + lines)
  const storeData = stores
    .map((store) => {
      const m = metricsMap.get(store.id) ?? {
        views: 0,
        calls: 0,
        navs: 0,
        lines: 0,
      };
      const totalActions = m.calls + m.navs + m.lines;
      const convRate =
        m.views > 0
          ? Math.round((totalActions / m.views) * 100)
          : 0;
      return { ...store, metrics: m, totalActions, convRate };
    })
    .sort((a, b) => b.totalActions - a.totalActions);

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">🏆 據點表現</h1>
      <p className="text-xs text-[var(--text-muted)] mb-6">
        各門市過去 30 天的瀏覽、致電、導航和 LINE 聯繫次數，幫助評估線下行銷成效。
      </p>

      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-[var(--bg-tertiary)] text-[var(--brand-accent)]">
              <th className="p-3 text-left font-medium">排名</th>
              <th className="p-3 text-left font-medium">門市</th>
              <th className="p-3 text-left font-medium">地區</th>
              <th className="p-3 text-right font-medium">查看</th>
              <th className="p-3 text-right font-medium">致電</th>
              <th className="p-3 text-right font-medium">導航</th>
              <th className="p-3 text-right font-medium">門市LINE</th>
              <th className="p-3 text-right font-medium">轉化率</th>
            </tr>
          </thead>
          <tbody>
            {storeData.map((store, i) => (
              <tr
                key={store.id}
                className="border-t border-[var(--border-strong)] hover:bg-[var(--bg-tertiary)]/50 transition"
              >
                <td className="p-3 text-[var(--text-secondary)]">{i + 1}</td>
                <td className="p-3 text-[var(--text-primary)] font-medium">{store.name}</td>
                <td className="p-3 text-[var(--text-secondary)]">{store.region.name}</td>
                <td className="p-3 text-right text-[var(--text-secondary)]">
                  {store.metrics.views}
                </td>
                <td className="p-3 text-right text-[var(--brand-accent)]">
                  {store.metrics.calls}
                </td>
                <td className="p-3 text-right text-emerald-600">
                  {store.metrics.navs}
                </td>
                <td className="p-3 text-right text-blue-600">
                  {store.metrics.lines}
                </td>
                <td className="p-3 text-right">
                  <span
                    className={
                      store.convRate > 30
                        ? "text-emerald-600 font-bold"
                        : store.convRate > 10
                          ? "text-[var(--brand-accent)]"
                          : "text-[var(--text-muted)]"
                    }
                  >
                    {store.convRate}%
                  </span>
                </td>
              </tr>
            ))}
            {storeData.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-[var(--text-muted)]">
                  尚無互動數據
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
