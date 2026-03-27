import { prisma } from "@/lib/prisma";
import { DonutChart, BarChart, TrendLine } from "@/components/analytics/Charts";

export const dynamic = "force-dynamic";

const CATEGORY_NAMES: Record<string, string> = {
  toilet: "馬桶/免治", basin: "面盆/浴櫃", faucet: "龍頭",
  bathtub: "浴缸", accessibility: "無障礙", accessories: "配件",
};
const CATEGORY_COLORS: Record<string, string> = {
  toilet: "#B89A6A", basin: "#4E7C5F", faucet: "#2B4C7E",
  bathtub: "#9E5A8C", accessibility: "#C75B39", accessories: "#6B7280",
};
const REGION_NAMES: Record<string, string> = {
  taipei: "大台北", hsinchu: "竹苗", taichung: "台中",
  tainan: "台南", kaohsiung: "高雄",
};
const REGION_COLORS: Record<string, string> = {
  taipei: "#B89A6A", hsinchu: "#4E7C5F", taichung: "#2B4C7E",
  tainan: "#9E5A8C", kaohsiung: "#C75B39",
};

export default async function AnalyticsPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart  = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart); monthStart.setDate(monthStart.getDate() - 30);

  // ── Basic counts ──
  const [todayCount, weekCount, monthCount, follows, unfollows, totalUsers] = await Promise.all([
    prisma.userEvent.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.userEvent.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.userEvent.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.userEvent.count({ where: { eventType: "FOLLOW", createdAt: { gte: monthStart } } }),
    prisma.userEvent.count({ where: { eventType: "UNFOLLOW", createdAt: { gte: monthStart } } }),
    prisma.userProfile.count({ where: { isBlocked: false } }),
  ]);

  // ── Lead score distribution ──
  const leadScores = await prisma.userProfile.groupBy({
    by: ["leadScore"], where: { isBlocked: false }, _count: true,
  });

  // ── Relationship level distribution ──
  const relLevels = await prisma.userProfile.groupBy({
    by: ["relationshipLevel"], where: { isBlocked: false }, _count: true,
  });

  // ── Product categories ──
  const topCategories = await prisma.userEvent.groupBy({
    by: ["category"],
    where: { eventType: "PRODUCT_VIEW", category: { not: null }, createdAt: { gte: monthStart } },
    _count: true, orderBy: { _count: { category: "desc" } }, take: 6,
  });

  // ── Region distribution ──
  const topRegions = await prisma.userEvent.groupBy({
    by: ["region"],
    where: { eventType: "REGION_SELECT", region: { not: null }, createdAt: { gte: monthStart } },
    _count: true, orderBy: { _count: { region: "desc" } }, take: 6,
  });

  // ── 7-day trend ──
  const dailyEvents: { date: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart); dayStart.setDate(dayStart.getDate() - i);
    const dayEnd   = new Date(dayStart);   dayEnd.setDate(dayEnd.getDate() + 1);
    const count = await prisma.userEvent.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } });
    dailyEvents.push({ date: `${dayStart.getMonth() + 1}/${dayStart.getDate()}`, value: count });
  }

  // ── Event type breakdown ──
  const eventTypes = await prisma.userEvent.groupBy({
    by: ["eventType"], where: { createdAt: { gte: monthStart } },
    _count: true, orderBy: { _count: { eventType: "desc" } },
  });

  // ── Conversion Funnel (distinct users per stage) ──
  const [
    funnelFollow, funnelEngaged, funnelProduct, funnelRegion, funnelStore,
  ] = await Promise.all([
    // Stage 1: All users (ever followed)
    prisma.userProfile.count(),
    // Stage 2: Engaged (sent message or clicked postback)
    prisma.userEvent.groupBy({ by: ["userId"], where: { eventType: { in: ["MESSAGE", "POSTBACK"] }, createdAt: { gte: monthStart } } }).then((r) => r.length),
    // Stage 3: Product interest
    prisma.userEvent.groupBy({ by: ["userId"], where: { eventType: "PRODUCT_VIEW", createdAt: { gte: monthStart } } }).then((r) => r.length),
    // Stage 4: Region selection
    prisma.userEvent.groupBy({ by: ["userId"], where: { eventType: "REGION_SELECT", createdAt: { gte: monthStart } } }).then((r) => r.length),
    // Stage 5: Store action (HOT trigger)
    prisma.userEvent.groupBy({ by: ["userId"], where: { eventType: { in: ["STORE_CALL", "STORE_NAV", "STORE_LINE"] }, createdAt: { gte: monthStart } } }).then((r) => r.length),
  ]);

  // ── Hourly distribution (last 30 days, Taiwan time offset +8) ──
  const hourlyRaw = await prisma.$queryRaw<{ hour: number; count: bigint }[]>`
    SELECT
      EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'Asia/Taipei')::int AS hour,
      COUNT(*)::bigint AS count
    FROM "UserEvent"
    WHERE "createdAt" >= ${monthStart}
    GROUP BY hour
    ORDER BY hour
  `;
  const hourlyCounts: number[] = Array(24).fill(0);
  for (const row of hourlyRaw) hourlyCounts[row.hour] = Number(row.count);

  // ── Sequence metrics ──
  const [seqPending, seqSent, seqProcessing] = await Promise.all([
    prisma.scheduledMessage.count({ where: { status: "pending" } }),
    prisma.scheduledMessage.count({ where: { status: "sent" } }),
    prisma.scheduledMessage.count({ where: { status: "processing" } }),
  ]);
  // Completion = users who have completedAt in new_customer sequence
  // Approximate via sequenceState JSON — use raw count of sent Day30 messages
  const day30Sent = await prisma.scheduledMessage.count({ where: { stepId: "step_day30", status: "sent" } });
  const newCustomerStarted = await prisma.scheduledMessage.count({ where: { sequenceId: "hardcode_new_customer", stepId: "step_day0" } });

  // ── Chart data ──
  const leadScoreData = [
    { label: "🔥 熱線索", value: leadScores.find((l) => l.leadScore === "HOT")?._count ?? 0, color: "#EF4444" },
    { label: "🟠 溫線索", value: leadScores.find((l) => l.leadScore === "WARM")?._count ?? 0, color: "#F59E0B" },
    { label: "❄️ 冷線索", value: leadScores.find((l) => l.leadScore === "COLD")?._count ?? 0, color: "#6B7280" },
  ];
  const relLevelOrder = ["新識", "認識", "熟識", "信任", "忠誠"];
  const relLevelColors = ["#6B7280", "#3B82F6", "#10B981", "#F59E0B", "#F97316"];
  const relLevelData = relLevelOrder.map((lv, i) => ({
    label: lv,
    value: relLevels.find((r) => r.relationshipLevel === lv)?._count ?? 0,
    color: relLevelColors[i],
  }));
  const categoryData = topCategories.map((c) => ({
    label: CATEGORY_NAMES[c.category!] ?? c.category!, value: c._count,
    color: CATEGORY_COLORS[c.category!] ?? "#666",
  }));
  const regionData = topRegions.map((r) => ({
    label: REGION_NAMES[r.region!] ?? r.region!, value: r._count,
    color: REGION_COLORS[r.region!] ?? "#666",
  }));
  const eventTypeNames: Record<string, string> = {
    FOLLOW: "加好友", UNFOLLOW: "封鎖", MESSAGE: "訊息", REGION_SELECT: "選地區",
    STORE_VIEW: "查門市", STORE_CALL: "致電", STORE_NAV: "導航", STORE_LINE: "門市LINE",
    PRODUCT_VIEW: "瀏覽產品", FALLBACK: "未匹配", POSTBACK: "點擊按鈕",
    SEQUENCE_COMPLETE: "序列完成",
  };
  const eventTypeData = eventTypes.map((e) => ({
    label: eventTypeNames[e.eventType] ?? e.eventType, value: e._count,
  }));

  // Funnel data
  const funnelStages = [
    { label: "加好友", count: funnelFollow, color: "#10B981" },
    { label: "互動/點擊", count: funnelEngaged, color: "#3B82F6" },
    { label: "瀏覽產品", count: funnelProduct, color: "#B89A6A" },
    { label: "選擇地區", count: funnelRegion, color: "#F59E0B" },
    { label: "門市行動", count: funnelStore, color: "#EF4444" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-100 mb-6">📊 互動分析</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <StatCard label="今日互動" value={todayCount} />
        <StatCard label="本週互動" value={weekCount} />
        <StatCard label="本月互動" value={monthCount} />
        <StatCard label="活躍用戶" value={totalUsers} color="text-blue-400" />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="本月新增好友" value={follows} color="text-green-400" />
        <StatCard label="本月封鎖" value={unfollows} color="text-red-400" />
      </div>

      {/* 7-day trend */}
      <div className="mb-6">
        <TrendLine data={dailyEvents} title="📈 過去 7 天互動趨勢" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <DonutChart data={leadScoreData} title="🎯 短期意圖分級" />
        <DonutChart data={relLevelData} title="💎 長期關係等級" />
        <DonutChart data={categoryData} title="🏷️ 熱門產品分類" />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <DonutChart data={regionData} title="📍 熱門地區分布" />
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <BarChart data={eventTypeData} title="📋 事件類型統計（本月）" />
        </div>
      </div>

      {/* ── Conversion Funnel ── */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-6">
        <h2 className="text-sm font-bold text-gray-300 mb-4">🔽 轉換漏斗（本月不重複用戶）</h2>
        <div className="space-y-2">
          {funnelStages.map((stage, i) => {
            const pct = funnelStages[0].count > 0
              ? Math.round((stage.count / funnelStages[0].count) * 100)
              : 0;
            const dropOff = i > 0 && funnelStages[i - 1].count > 0
              ? Math.round(((funnelStages[i - 1].count - stage.count) / funnelStages[i - 1].count) * 100)
              : null;
            return (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{stage.label}</span>
                  <div className="flex items-center gap-3">
                    {dropOff !== null && (
                      <span className="text-xs text-red-400">▼ {dropOff}% 流失</span>
                    )}
                    <span className="text-sm font-bold text-gray-100">{stage.count.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-5 relative overflow-hidden">
                  <div
                    className="h-5 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: stage.color, opacity: 0.8 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Hourly Distribution (Behavioral Chronos) ── */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-6">
        <h2 className="text-sm font-bold text-gray-300 mb-1">🕐 24小時互動分布（行為時光隧道）</h2>
        <p className="text-xs text-gray-600 mb-4">過去 30 天，用戶最活躍的時段</p>
        <HourlyChart counts={hourlyCounts} />
      </div>

      {/* ── Sequence Metrics ── */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <h2 className="text-sm font-bold text-gray-300 mb-4">📬 自動序列指標</h2>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <StatCard label="待發送" value={seqPending} color="text-amber-400" />
          <StatCard label="已發送" value={seqSent} color="text-green-400" />
          <StatCard label="處理中" value={seqProcessing} color="text-blue-400" />
          <StatCard label="序列啟動數" value={newCustomerStarted} color="text-gray-400" />
        </div>
        {newCustomerStarted > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>新客序列完成率（Day30 發送）</span>
              <span>{Math.round((day30Sent / newCustomerStarted) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full"
                style={{ width: `${Math.round((day30Sent / newCustomerStarted) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {day30Sent} / {newCustomerStarted} 人完成（目標 &gt; 40%）
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hourly bar chart (pure SVG, server-side) ──
function HourlyChart({ counts }: { counts: number[] }) {
  const max = Math.max(...counts, 1);
  const W = 560, H = 80;
  const barW = W / 24;

  const peakHour = counts.indexOf(Math.max(...counts));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full">
        {counts.map((c, h) => {
          const barH = (c / max) * H;
          const x = h * barW;
          const isPeak = h === peakHour;
          const isNight = h >= 22 || h < 6;
          const color = isPeak ? "#B89A6A" : isNight ? "#4B5563" : "#374151";
          return (
            <g key={h}>
              <rect
                x={x + 1} y={H - barH} width={barW - 2} height={barH}
                fill={color} rx="1"
              />
              {(h % 3 === 0) && (
                <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize="9" fill="#6B7280">
                  {h}時
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-gray-500 mt-1">
        🏆 最活躍時段：{peakHour} 時（{counts[peakHour].toLocaleString()} 次）
        {(peakHour >= 22 || peakHour < 6) && " · 深夜族群明顯"}
        {peakHour >= 6 && peakHour < 10 && " · 早晨通勤族"}
        {peakHour >= 12 && peakHour < 14 && " · 午休高峰"}
        {peakHour >= 20 && peakHour < 22 && " · 晚間睡前"}
      </p>
    </div>
  );
}

function StatCard({ label, value, color = "text-amber-400" }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}
