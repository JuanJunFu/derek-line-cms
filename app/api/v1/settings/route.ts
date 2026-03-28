import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.siteSetting.findMany({
    orderBy: { key: "asc" },
  });
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { settings } = body as {
    settings: { key: string; value: string; label?: string }[];
  };

  // Use upsert so new settings are created automatically
  await Promise.all(
    settings.map((s) =>
      prisma.siteSetting.upsert({
        where: { key: s.key },
        update: { value: s.value ?? "" },
        create: {
          key: s.key,
          value: s.value ?? "",
          label: s.label || s.key,
        },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
