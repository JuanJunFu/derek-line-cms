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
        <h1 className="text-xl font-bold text-gray-100">地區管理</h1>
        <Link
          href="/regions/new"
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
        >
          ＋ 新增地區
        </Link>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800 text-amber-500">
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
              <tr key={r.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition">
                <td className="p-3 text-gray-400">{r.order}</td>
                <td className="p-3 font-medium text-gray-200">{r.name}</td>
                <td className="p-3 text-gray-400 font-mono text-xs">{r.slug}</td>
                <td className="p-3 text-gray-400 text-xs">{r.counties.join("、")}</td>
                <td className="p-3 text-gray-400">{r._count.stores}</td>
                <td className="p-3">
                  <span className={r.isActive ? "text-green-400" : "text-gray-500"}>
                    {r.isActive ? "● 啟用" : "○ 停用"}
                  </span>
                </td>
                <td className="p-3">
                  <Link href={`/regions/${r.id}`} className="text-amber-500 hover:text-amber-400 font-medium">
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
