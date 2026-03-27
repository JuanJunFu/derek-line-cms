import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const settings = await prisma.siteSetting.findMany({
    orderBy: { key: "asc" },
  });
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { settings } = body as { settings: { key: string; value: string }[] };

  await Promise.all(
    settings.map((s) =>
      prisma.siteSetting.update({
        where: { key: s.key },
        data: { value: s.value },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
