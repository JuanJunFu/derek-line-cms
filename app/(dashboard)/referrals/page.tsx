import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const [referrals, completedCount, pendingCount] = await Promise.all([
    prisma.referral.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.referral.count({ where: { status: "COMPLETED" } }),
    prisma.referral.count({ where: { status: "PENDING" } }),
  ]);

  // Profile lookup
  const userIds = [
    ...new Set(
      referrals.flatMap((r) =>
        [r.referrerUserId, r.refereeUserId].filter(Boolean) as string[]
      )
    ),
  ];
  const profiles = await prisma.userProfile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, displayName: true, relationshipLevel: true },
  });
  const profileMap = Object.fromEntries(profiles.map((p) => [p.userId, p]));

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-100 mb-1">🤝 推薦管理</h1>
      <p className="text-xs text-gray-500 mb-6">
        客戶推薦碼追蹤 · 共 {completedCount + pendingCount} 組推薦碼
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{completedCount}</p>
          <p className="text-xs text-gray-500 mt-1">✅ 已完成推薦</p>
        </div>
        <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{pendingCount}</p>
          <p className="text-xs text-gray-500 mt-1">⏳ 待使用</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">
            {completedCount + pendingCount > 0
              ? Math.round((completedCount / (completedCount + pendingCount)) * 100)
              : 0}
            %
          </p>
          <p className="text-xs text-gray-500 mt-1">📊 轉換率</p>
        </div>
      </div>

      {/* Referral table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs">
              <th className="text-left px-4 py-3">推薦碼</th>
              <th className="text-left px-4 py-3">推薦人</th>
              <th className="text-left px-4 py-3">被推薦人</th>
              <th className="text-left px-4 py-3">狀態</th>
              <th className="text-left px-4 py-3">建立時間</th>
              <th className="text-left px-4 py-3">完成時間</th>
            </tr>
          </thead>
          <tbody>
            {referrals.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-600 py-8">
                  尚無推薦紀錄
                </td>
              </tr>
            ) : (
              referrals.map((r) => {
                const referrer = profileMap[r.referrerUserId];
                const referee = r.refereeUserId ? profileMap[r.refereeUserId] : null;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-amber-400 font-bold">
                        {r.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/leads/${encodeURIComponent(r.referrerUserId)}`}
                        className="text-gray-200 hover:text-amber-400 transition"
                      >
                        {referrer?.displayName || r.referrerUserId.slice(0, 12) + "…"}
                      </Link>
                      {referrer?.relationshipLevel && (
                        <span className="text-xs text-gray-600 ml-1">
                          ({referrer.relationshipLevel})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.refereeUserId ? (
                        <Link
                          href={`/leads/${encodeURIComponent(r.refereeUserId)}`}
                          className="text-gray-200 hover:text-amber-400 transition"
                        >
                          {referee?.displayName || r.refereeUserId.slice(0, 12) + "…"}
                        </Link>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          r.status === "COMPLETED"
                            ? "bg-green-900/40 text-green-400"
                            : "bg-amber-900/40 text-amber-400"
                        }`}
                      >
                        {r.status === "COMPLETED" ? "✅ 已完成" : "⏳ 待使用"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.createdAt.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.completedAt
                        ? r.completedAt.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
                        : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
