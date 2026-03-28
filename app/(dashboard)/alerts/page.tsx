import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const logs = await prisma.alertLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { rule: true },
  });

  const unreadCount = logs.filter((l) => !l.isRead).length;

  // Mark all as read on page view
  if (unreadCount > 0) {
    await prisma.alertLog.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">🔔 通知中心</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            潛在客戶即時警報 — 共 {logs.length} 筆通知
            {unreadCount > 0 && (
              <span className="text-[var(--brand-accent)] ml-2">
                ({unreadCount} 筆未讀)
              </span>
            )}
          </p>
        </div>
        <Link
          href="/alerts/settings"
          className="text-sm bg-[var(--bg-tertiary)] hover:bg-[var(--border-strong)] text-[var(--text-secondary)] px-3 py-1.5 rounded-lg"
        >
          ⚙️ 閾值設定
        </Link>
      </div>

      {logs.length === 0 ? (
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-8 text-center">
          <p className="text-[var(--text-muted)]">尚無通知紀錄</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            當用戶觸發高意圖行為時，系統會自動產生通知
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`bg-[var(--bg-secondary)] rounded-xl border p-4 ${
                !log.isRead
                  ? "border-[var(--brand-accent)]/30 bg-[var(--brand-accent)]/10"
                  : "border-[var(--border-strong)]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {log.rule.name}
                    </span>
                    {log.lineNotified && (
                      <span className="text-xs bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">
                        LINE 已通知
                      </span>
                    )}
                    {!log.isRead && (
                      <span className="text-xs bg-[var(--brand-accent)]/15 text-[var(--brand-accent)] px-1.5 py-0.5 rounded">
                        新
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)] mb-2">
                    {log.storeName && <span>🏪 {log.storeName}</span>}
                    {log.regionName && <span>📍 {log.regionName}</span>}
                    <span>
                      👤{" "}
                      <Link
                        href={`/leads/${encodeURIComponent(log.userId)}`}
                        className="text-[var(--brand-accent)] hover:underline"
                      >
                        {log.userName || log.userId.slice(0, 12) + "..."}
                      </Link>
                    </span>
                  </div>

                  {log.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {log.tags.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right text-xs text-[var(--text-muted)] whitespace-nowrap ml-4">
                  {formatTime(log.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "剛剛";
  if (min < 60) return `${min} 分鐘前`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return date.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });
}
