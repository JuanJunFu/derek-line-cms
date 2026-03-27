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
          <h1 className="text-xl font-bold text-gray-100">🔔 通知中心</h1>
          <p className="text-xs text-gray-500 mt-1">
            潛在客戶即時警報 — 共 {logs.length} 筆通知
            {unreadCount > 0 && (
              <span className="text-amber-400 ml-2">
                ({unreadCount} 筆未讀)
              </span>
            )}
          </p>
        </div>
        <Link
          href="/alerts/settings"
          className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg"
        >
          ⚙️ 閾值設定
        </Link>
      </div>

      {logs.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
          <p className="text-gray-500">尚無通知紀錄</p>
          <p className="text-xs text-gray-600 mt-2">
            當用戶觸發高意圖行為時，系統會自動產生通知
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`bg-gray-900 rounded-xl border p-4 ${
                !log.isRead
                  ? "border-amber-700/50 bg-amber-950/10"
                  : "border-gray-800"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-200">
                      {log.rule.name}
                    </span>
                    {log.lineNotified && (
                      <span className="text-xs bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded">
                        LINE 已通知
                      </span>
                    )}
                    {!log.isRead && (
                      <span className="text-xs bg-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded">
                        新
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-2">
                    {log.storeName && <span>🏪 {log.storeName}</span>}
                    {log.regionName && <span>📍 {log.regionName}</span>}
                    <span>
                      👤{" "}
                      <Link
                        href={`/leads/${encodeURIComponent(log.userId)}`}
                        className="text-amber-400 hover:underline"
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
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right text-xs text-gray-600 whitespace-nowrap ml-4">
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
  if (min < 60) return `${min} 分鐘前`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return date.toLocaleDateString("zh-TW");
}
