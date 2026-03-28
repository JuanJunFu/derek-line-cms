import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RegionsPage() {
  const regions = await prisma.region.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { stores: true } } },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">地區管理</h1>
        <Link
          href="/regions/new"
          className="bg-[var(--brand-primary)] hover:bg-[var(--text-secondary)] text-white px-4 py-2 rounded-lg text-sm font-bold transition"
        >
          ＋ 新增地區
        </Link>
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-[var(--bg-tertiary)] text-[var(--brand-accent)]">
              <th className="p-3 text-left font-medium">排序</th>
              <th className="p-3 text-left font-medium">地區名稱</th>
              <th className="p-3 text-left font-medium">代碼</th>
              <th className="p-3 text-left font-medium">縣市</th>
              <th className="p-3 text-left font-medium">門市數</th>
              <th className="p-3 text-left font-medium">狀態</th>
              <th className="p-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border-strong)] hover:bg-[var(--bg-tertiary)]/50 transition">
                <td className="p-3 text-[var(--text-secondary)]">{r.order}</td>
                <td className="p-3 font-medium text-[var(--text-primary)]">{r.name}</td>
                <td className="p-3 text-[var(--text-secondary)] font-mono text-xs">{r.slug}</td>
                <td className="p-3 text-[var(--text-secondary)] text-xs">{r.counties.join("、")}</td>
                <td className="p-3 text-[var(--text-secondary)]">{r._count.stores}</td>
                <td className="p-3">
                  <span className={r.isActive ? "text-emerald-600" : "text-[var(--text-muted)]"}>
                    {r.isActive ? "● 啟用" : "○ 停用"}
                  </span>
                </td>
                <td className="p-3">
                  <Link href={`/regions/${r.id}`} className="text-[var(--brand-accent)] hover:text-[var(--brand-accent)] font-medium">
                    編輯
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
