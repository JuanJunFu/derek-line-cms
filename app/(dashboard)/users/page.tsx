import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsersClient } from "@/components/users/UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as any)?.role;
  if (role !== "ADMIN") {
    return (
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">使用者管理</h1>
        <p className="text-sm text-red-600">只有管理員才能查看此頁面。</p>
      </div>
    );
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">使用者管理</h1>
      <p className="text-xs text-[var(--text-muted)] mb-6">
        管理可透過 Google (Gmail) 登入後台的使用者。新增 Email 後，該帳號即可使用 Google 登入。
      </p>
      <UsersClient
        initialUsers={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
        currentEmail={session.user?.email ?? ""}
      />
    </div>
  );
}
