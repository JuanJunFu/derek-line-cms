import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NavLink } from "@/components/ui/NavLink";
import { MobileSidebar } from "@/components/ui/MobileSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <MobileSidebar>
        <div className="px-5 py-6 border-b border-[var(--border-strong)]">
          <h1 className="text-base font-medium tracking-[0.15em] text-[var(--text-primary)]">
            DEREK
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 tracking-wider">
            德瑞克衛浴 CMS
          </p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <NavLink href="/stores">門市管理</NavLink>
          <NavLink href="/regions">地區管理</NavLink>
          <NavLink href="/products">產品分類</NavLink>
          <NavLink href="/replies">自動回覆</NavLink>
          <NavLink href="/settings">系統設定</NavLink>
          <NavLink href="/users">使用者管理</NavLink>
          <div className="my-3 border-t border-[var(--border-subtle)]" />
          <NavLink href="/analytics">互動分析</NavLink>
          <NavLink href="/leads">客戶矩陣</NavLink>
          <NavLink href="/war-room">戰情室</NavLink>
          <NavLink href="/broadcasts">群發推播</NavLink>
          <NavLink href="/sequences">序列管理</NavLink>
          <NavLink href="/rich-menus">圖文選單</NavLink>
          <NavLink href="/referrals">推薦管理</NavLink>
          <NavLink href="/segments">受眾分群</NavLink>
          <NavLink href="/tags">標籤管理</NavLink>
          <NavLink href="/alerts">通知中心</NavLink>
          <NavLink href="/analytics/stores">據點表現</NavLink>
          <NavLink href="/analytics/keywords">詞雲分析</NavLink>
          <NavLink href="/graph">關係圖</NavLink>
        </nav>
        <div className="px-5 py-4 border-t border-[var(--border-strong)]">
          <p className="text-xs text-[var(--text-muted)] truncate">
            {session.user?.name}
          </p>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-xs text-[var(--text-muted)] hover:text-[var(--status-hot)] mt-1 transition-colors duration-200"
            >
              登出
            </button>
          </form>
        </div>
      </MobileSidebar>

      {/* Main content */}
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8 pt-16 md:pt-8 min-w-0 bg-[var(--bg-tertiary)]">
        {children}
      </main>
    </div>
  );
}
