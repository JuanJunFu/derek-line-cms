import { prisma } from "@/lib/prisma";
import { RichMenuClient } from "@/components/rich-menus/RichMenuClient";

export const dynamic = "force-dynamic";

export default async function RichMenusPage() {
  const menus = await prisma.richMenu.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          圖文選單管理
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          管理 LINE 圖文選單的建立、部署與預設設定
        </p>
      </div>
      <RichMenuClient initialMenus={menus as any} />
    </div>
  );
}
