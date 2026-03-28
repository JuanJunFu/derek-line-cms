import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hashSync } from "bcryptjs";

/** GET /api/v1/users — List all admin users */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: users });
}

/** POST /api/v1/users — Create a new admin user (Gmail login) */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only ADMIN can manage users
  const role = (session.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "只有管理員才能新增使用者" }, { status: 403 });
  }

  const body = await req.json();
  const { email, name, role: userRole } = body as {
    email: string;
    name: string;
    role?: string;
  };

  if (!email || !name) {
    return NextResponse.json({ error: "email 和 name 為必填" }, { status: 400 });
  }

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "此 Email 已存在" }, { status: 409 });
  }

  const validRoles = ["ADMIN", "EDITOR", "VIEWER"];
  const finalRole = validRoles.includes(userRole ?? "") ? userRole! : "VIEWER";

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: finalRole as any,
      password: hashSync("google-oauth-only", 12), // Placeholder — login via Google only
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json({ data: user }, { status: 201 });
}
