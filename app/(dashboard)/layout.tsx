import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NavLink } from "@/components/ui/NavLink";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-lg font-bold text-amber-500">DEREK</h1>
          <p className="text-xs text-gray-500">德瑞克衛浴 CMS</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink href="/stores">🏪 門市管理</NavLink>
          <NavLink href="/regions">📍 地區管理</NavLink>
          <NavLink href="/products">📦 產品分類</NavLink>
          <NavLink href="/replies">💬 自動回覆</NavLink>
          <NavLink href="/settings">⚙️ 系統設定</NavLink>
          <NavLink href="/users">👤 使用者管理</NavLink>
          <div className="my-2 border-t border-gray-800" />
          <NavLink href="/analytics">📊 互動分析</NavLink>
          <NavLink href="/leads">🎯 客戶矩陣</NavLink>
          <NavLink href="/war-room">🔥 戰情室</NavLink>
          <NavLink href="/sequences">📬 序列管理</NavLink>
          <NavLink href="/referrals">🤝 推薦管理</NavLink>
          <NavLink href="/alerts">🔔 通知中心</NavLink>
          <NavLink href="/analytics/stores">🏆 據點表現</NavLink>
          <NavLink href="/analytics/keywords">☁️ 詞雲分析</NavLink>
          <NavLink href="/graph">🕸️ 關係圖</NavLink>
        </nav>
        <div className="p-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 truncate">
            {session.user?.name}
          </p>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-xs text-gray-500 hover:text-red-400 mt-1"
            >
              登出
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 bg-gray-950">{children}</main>
    </div>
  );
}
