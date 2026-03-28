import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Parallel data fetching
  const [
    todayFollows,
    todayUnfollows,
    hotLeads,
    pendingMessages,
    dueSoonMessages,
    sentToday,
    recentHotEvents,
    totalProfiles,
    todayEvents,
    recentReferrals,
  ] = await Promise.all([
    // Today's new followers
    prisma.userEvent.count({
      where: { eventType: "FOLLOW", createdAt: { gte: todayStart } },
    }),
    // Today's unfollows
    prisma.userEvent.count({
      where: { eventType: "UNFOLLOW", createdAt: { gte: todayStart } },
    }),
    // HOT leads (top 5 most recent)
    prisma.userProfile.findMany({
      where: { leadScore: "HOT", isBlocked: false },
      orderBy: { lastActive: "desc" },
      take: 5,
    }),
    // Pending sequence messages
    prisma.scheduledMessage.count({
      where: { status: "pending" },
    }),
    // Due in next 24h
    prisma.scheduledMessage.count({
      where: {
        status: "pending",
        scheduledAt: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
      },
    }),
    // Sent today
    prisma.scheduledMessage.count({
      where: { status: "sent", sentAt: { gte: todayStart } },
    }),
    // Recent high-intent events (STORE_CALL/NAV/LINE in last 24h)
    prisma.userEvent.findMany({
      where: {
        eventType: { in: ["STORE_CALL", "STORE_NAV", "STORE_LINE"] },
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    // Total profiles
    prisma.userProfile.count(),
    // Today's total events
    prisma.userEvent.count({
      where: { createdAt: { gte: todayStart } },
    }),
    // Recent referral completions
    prisma.referral.findMany({
      where: { status: "COMPLETED", completedAt: { gte: weekAgo } },
      orderBy: { completedAt: "desc" },
      take: 3,
    }),
  ]);

  const EVENT_LABELS: Record<string, string> = {
    STORE_CALL: "📞 致電門市",
    STORE_NAV: "🗺️ 導航前往",
    STORE_LINE: "💬 LINE 聯繫",
  };

  function timeAgo(date: Date): string {
    const mins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (mins < 1) return "剛剛";
    if (mins < 60) return `${mins} 分鐘前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} 小時前`;
    return `${Math.floor(hrs / 24)} 天前`;
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          📊 今日概覽
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          DEREK 德瑞克衛浴 LINE 後台 ·{" "}
          {now.toLocaleDateString("zh-TW", {
            timeZone: "Asia/Taipei",
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{todayFollows}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">今日新好友</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{hotLeads.length}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">🔥 高意向客戶</p>
        </div>
        <div className="bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--brand-accent)]">
            {pendingMessages}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">序列待發送</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{todayEvents}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">今日互動數</p>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {totalProfiles}
          </p>
          <p className="text-xs text-[var(--text-muted)]">總好友數</p>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {dueSoonMessages}
          </p>
          <p className="text-xs text-[var(--text-muted)]">24h 內到期</p>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {sentToday}
          </p>
          <p className="text-xs text-[var(--text-muted)]">今日已發送</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Needs attention */}
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              ⚡ 需要你注意的事
            </h2>
            <Link
              href="/war-room"
              className="text-xs text-[var(--brand-accent)] hover:underline"
            >
              查看戰情室 →
            </Link>
          </div>

          {recentHotEvents.length === 0 && hotLeads.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">
              ✅ 目前沒有需要立即處理的事項
            </p>
          ) : (
            <div className="space-y-2">
              {/* Hot events */}
              {recentHotEvents.map((evt) => (
                <Link
                  key={evt.id}
                  href={`/leads/${encodeURIComponent(evt.userId)}`}
                  className="flex items-center justify-between text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 hover:bg-red-100 transition"
                >
                  <div className="flex items-center gap-2">
                    <span>{EVENT_LABELS[evt.eventType] || evt.eventType}</span>
                    <span className="text-[var(--text-secondary)] font-medium">
                      {(evt.data as Record<string, string>)?.storeName ||
                        evt.userId.slice(0, 10) + "…"}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {timeAgo(evt.createdAt)}
                  </span>
                </Link>
              ))}

              {/* Recent referrals */}
              {recentReferrals.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between text-sm bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span>🤝 推薦完成</span>
                    <span className="font-mono text-xs text-[var(--brand-accent)]">
                      {ref.code}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {ref.completedAt ? timeAgo(ref.completedAt) : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: HOT leads */}
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              🔥 高意向客戶
            </h2>
            <Link
              href="/leads"
              className="text-xs text-[var(--brand-accent)] hover:underline"
            >
              查看全部 →
            </Link>
          </div>

          {hotLeads.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">
              目前沒有高意向客戶
            </p>
          ) : (
            <div className="space-y-2">
              {hotLeads.map((lead) => {
                const regionTag = lead.tags.find((t: string) =>
                  t.startsWith("Region:")
                );
                return (
                  <Link
                    key={lead.userId}
                    href={`/leads/${encodeURIComponent(lead.userId)}`}
                    className="flex items-center justify-between text-sm bg-[var(--bg-tertiary)] rounded-lg px-3 py-2.5 hover:border-[var(--brand-accent)] border border-transparent transition"
                  >
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">
                        {lead.displayName || lead.userId.slice(0, 12) + "…"}
                      </span>
                      {lead.customerType === "returning" && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-[var(--brand-accent)]/15 text-[var(--brand-accent)]">
                          🔄 熟客
                        </span>
                      )}
                      {regionTag && (
                        <span className="ml-2 text-xs text-[var(--text-muted)]">
                          📍 {regionTag.replace("Region:", "")}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[var(--text-muted)]">
                        {lead.relationshipLevel}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] ml-1">
                        ({lead.relationshipScore}分)
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-5">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">
          🚀 快速操作
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link
            href="/sequences"
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--brand-accent)]/10 border border-transparent hover:border-[var(--brand-accent)]/30 transition text-center"
          >
            <span className="text-xl">📬</span>
            <span className="text-xs text-[var(--text-secondary)]">
              序列管理
            </span>
          </Link>
          <Link
            href="/broadcasts"
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--brand-accent)]/10 border border-transparent hover:border-[var(--brand-accent)]/30 transition text-center"
          >
            <span className="text-xl">📣</span>
            <span className="text-xs text-[var(--text-secondary)]">
              群發推播
            </span>
          </Link>
          <Link
            href="/replies"
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--brand-accent)]/10 border border-transparent hover:border-[var(--brand-accent)]/30 transition text-center"
          >
            <span className="text-xl">💬</span>
            <span className="text-xs text-[var(--text-secondary)]">
              自動回覆
            </span>
          </Link>
          <Link
            href="/analytics"
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--brand-accent)]/10 border border-transparent hover:border-[var(--brand-accent)]/30 transition text-center"
          >
            <span className="text-xl">📊</span>
            <span className="text-xs text-[var(--text-secondary)]">
              互動分析
            </span>
          </Link>
        </div>
      </div>

      {/* Today's unfollows note */}
      {todayUnfollows > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          ⚠️ 今日有 {todayUnfollows} 位用戶封鎖/取消追蹤
        </div>
      )}
    </div>
  );
}
