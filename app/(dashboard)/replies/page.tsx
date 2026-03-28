import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RepliesPage() {
  const replies = await prisma.autoReply.findMany({
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-100">自動回覆管理</h1>
        <Link
          href="/replies/new"
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
        >
          ＋ 新增回覆
        </Link>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-gray-800 text-amber-500">
              <th className="p-3 text-left font-medium">排序</th>
              <th className="p-3 text-left font-medium">關鍵字</th>
              <th className="p-3 text-left font-medium">回覆內容</th>
              <th className="p-3 text-left font-medium">狀態</th>
              <th className="p-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {replies.map((r) => (
              <tr
                key={r.id}
                className="border-t border-gray-800 hover:bg-gray-800/50 transition"
              >
                <td className="p-3 text-gray-400">{r.order}</td>
                <td className="p-3">
                  {r.keyword ? (
                    <span className="font-mono text-xs bg-gray-800 text-amber-400 px-2 py-0.5 rounded">
                      {r.keyword}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 italic">
                      預設回覆
                    </span>
                  )}
                </td>
                <td className="p-3 text-gray-300 max-w-xs truncate">
                  {r.message === "SHOW_REGION_MENU" ? (
                    <span className="text-xs bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded">
                      系統指令：顯示地區選單
                    </span>
                  ) : r.message === "SHOW_PRODUCT_MENU" ? (
                    <span className="text-xs bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded">
                      系統指令：顯示產品選單
                    </span>
                  ) : (
                    r.message.slice(0, 60) + (r.message.length > 60 ? "..." : "")
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={
                      r.isActive ? "text-green-400" : "text-gray-500"
                    }
                  >
                    {r.isActive ? "● 啟用" : "○ 停用"}
                  </span>
                </td>
                <td className="p-3 flex gap-3">
                  <Link
                    href={"/replies/" + r.id}
                    className="text-amber-500 hover:text-amber-400 font-medium"
                  >
                    編輯
                  </Link>
                  <DeleteButton id={r.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeleteButton({ id }: { id: string }) {
  async function deleteReply() {
    "use server";
    const { prisma } = await import("@/lib/prisma");
    await prisma.autoReply.delete({ where: { id } });
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/replies");
  }

  return (
    <form action={deleteReply}>
      <button
        type="submit"
        className="text-red-400 hover:text-red-300 text-sm"
      >
        刪除
      </button>
    </form>
  );
}
