import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PATCH /api/v1/leads/[userId] — update user profile fields (customerType, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const decodedUserId = decodeURIComponent(userId);
  const body = await req.json();

  const { customerType } = body as { customerType?: string };

  if (customerType && !["new", "returning"].includes(customerType)) {
    return NextResponse.json({ error: "無效的客戶類型" }, { status: 400 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: decodedUserId },
  });

  if (!profile) {
    return NextResponse.json({ error: "用戶不存在" }, { status: 404 });
  }

  const updated = await prisma.userProfile.update({
    where: { userId: decodedUserId },
    data: {
      ...(customerType !== undefined ? { customerType } : {}),
    },
  });

  return NextResponse.json({ success: true, profile: updated });
}
