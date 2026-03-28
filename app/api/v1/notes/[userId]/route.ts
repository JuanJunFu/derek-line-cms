import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const decodedUserId = decodeURIComponent(userId);

  const notes = await prisma.userNote.findMany({
    where: { userId: decodedUserId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ notes });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any)?.role;
  if (role !== "ADMIN" && role !== "EDITOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const decodedUserId = decodeURIComponent(userId);

  const body = await req.json();
  const { content } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  // Look up the admin user by email to get id and name
  const email = session.user?.email;
  if (!email) {
    return NextResponse.json({ error: "No email in session" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const note = await prisma.userNote.create({
    data: {
      userId: decodedUserId,
      authorId: dbUser.id,
      authorName: dbUser.name,
      content: content.trim(),
    },
  });

  return NextResponse.json({ note }, { status: 201 });
}
