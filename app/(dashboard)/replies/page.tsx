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
        <h1 className="text-xl font-bold text-[var(--text-primary)]">自動回覆管理</h1>
        <Link
          href="/replies/new"
          className="bg-[var(--brand-primary)] hover:bg-[var(--text-secondary)] text-white px-4 py-2 rounded-lg text-sm font-bold transition"
        >
          ＋ 新增回覆
        </Link>
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-[var(--bg-tertiary)] text-[var(--brand-accent)]">
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
                className="border-t border-[var(--border-strong)] hover:bg-[var(--bg-tertiary)]/50 transition"
              >
                <td className="p-3 text-[var(--text-secondary)]">{r.order}</td>
                <td className="p-3">
                  {r.keyword ? (
                    <span className="font-mono text-xs bg-[var(--bg-tertiary)] text-[var(--brand-accent)] px-2 py-0.5 rounded">
                      {r.keyword}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)] italic">
                      預設回覆
                    </span>
                  )}
                </td>
                <td className="p-3 text-[var(--text-secondary)] max-w-xs truncate">
                  {r.message === "SHOW_REGION_MENU" ? (
                    <span className="text-xs bg-[var(--brand-accent)]/10 text-[var(--brand-accent)] px-2 py-0.5 rounded">
                      系統指令：顯示地區選單
                    </span>
                  ) : r.message === "SHOW_PRODUCT_MENU" ? (
                    <span className="text-xs bg-[var(--brand-accent)]/10 text-[var(--brand-accent)] px-2 py-0.5 rounded">
                      系統指令：顯示產品選單
                    </span>
                  ) : (
                    r.message.slice(0, 60) + (r.message.length > 60 ? "..." : "")
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={
                      r.isActive ? "text-emerald-600" : "text-[var(--text-muted)]"
                    }
                  >
                    {r.isActive ? "● 啟用" : "○ 停用"}
                  </span>
                </td>
                <td className="p-3 flex gap-3">
                  <Link
                    href={"/replies/" + r.id}
                    className="text-[var(--brand-accent)] hover:text-[var(--brand-accent)] font-medium"
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
        className="text-red-600 hover:text-red-600 text-sm"
      >
        刪除
      </button>
    </form>
  );
}
