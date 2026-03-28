import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/** PUT /api/v1/users/:id — Update user role/name */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "只有管理員才能修改使用者" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, role: newRole } = body as { name?: string; role?: string };

  const validRoles = ["ADMIN", "EDITOR", "VIEWER"];
  const data: Record<string, string> = {};
  if (name) data.name = name;
  if (newRole && validRoles.includes(newRole)) data.role = newRole;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "沒有要更新的資料" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json({ data: user });
}

/** DELETE /api/v1/users/:id — Remove user (revoke Gmail login access) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "只有管理員才能刪除使用者" }, { status: 403 });
  }

  const { id } = await params;

  // Prevent deleting yourself
  const currentUser = await prisma.user.findFirst({
    where: { email: session.user?.email ?? "" },
  });
  if (currentUser?.id === id) {
    return NextResponse.json({ error: "無法刪除自己的帳號" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
