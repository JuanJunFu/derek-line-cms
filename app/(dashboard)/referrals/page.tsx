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
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">🤝 推薦管理</h1>
      <p className="text-xs text-[var(--text-muted)] mb-6">
        客戶推薦碼追蹤 · 共 {completedCount + pendingCount} 組推薦碼
      </p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{completedCount}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">✅ 已完成推薦</p>
        </div>
        <div className="bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-[var(--brand-accent)]">{pendingCount}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">⏳ 待使用</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">
            {completedCount + pendingCount > 0
              ? Math.round((completedCount / (completedCount + pendingCount)) * 100)
              : 0}
            %
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">📊 轉換率</p>
        </div>
      </div>

      {/* Referral table */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-[var(--border-strong)] text-[var(--text-muted)] text-xs">
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
                <td colSpan={6} className="text-center text-[var(--text-muted)] py-8">
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
                    className="border-b border-[var(--border-strong)]/50 hover:bg-[var(--bg-tertiary)]/30 transition"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-[var(--brand-accent)] font-bold">
                        {r.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/leads/${encodeURIComponent(r.referrerUserId)}`}
                        className="text-[var(--text-primary)] hover:text-[var(--brand-accent)] transition"
                      >
                        {referrer?.displayName || r.referrerUserId.slice(0, 12) + "…"}
                      </Link>
                      {referrer?.relationshipLevel && (
                        <span className="text-xs text-[var(--text-muted)] ml-1">
                          ({referrer.relationshipLevel})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.refereeUserId ? (
                        <Link
                          href={`/leads/${encodeURIComponent(r.refereeUserId)}`}
                          className="text-[var(--text-primary)] hover:text-[var(--brand-accent)] transition"
                        >
                          {referee?.displayName || r.refereeUserId.slice(0, 12) + "…"}
                        </Link>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          r.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-[var(--brand-accent)]/15 text-[var(--brand-accent)]"
                        }`}
                      >
                        {r.status === "COMPLETED" ? "✅ 已完成" : "⏳ 待使用"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {r.createdAt.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
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
