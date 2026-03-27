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
      <h1 className="text-xl font-bold text-gray-100 mb-6">🏆 據點表現</h1>
      <p className="text-sm text-gray-500 mb-4">過去 30 天數據</p>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800 text-amber-500">
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
                className="border-t border-gray-800 hover:bg-gray-800/50 transition"
              >
                <td className="p-3 text-gray-400">{i + 1}</td>
                <td className="p-3 text-gray-200 font-medium">{store.name}</td>
                <td className="p-3 text-gray-400">{store.region.name}</td>
                <td className="p-3 text-right text-gray-400">
                  {store.metrics.views}
                </td>
                <td className="p-3 text-right text-amber-400">
                  {store.metrics.calls}
                </td>
                <td className="p-3 text-right text-green-400">
                  {store.metrics.navs}
                </td>
                <td className="p-3 text-right text-blue-400">
                  {store.metrics.lines}
                </td>
                <td className="p-3 text-right">
                  <span
                    className={
                      store.convRate > 30
                        ? "text-green-400 font-bold"
                        : store.convRate > 10
                          ? "text-amber-400"
                          : "text-gray-500"
                    }
                  >
                    {store.convRate}%
                  </span>
                </td>
              </tr>
            ))}
            {storeData.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
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
