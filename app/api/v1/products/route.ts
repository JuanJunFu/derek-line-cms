import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/v1/products — public (used by LINE Bot)
export async function GET() {
  const categories = await prisma.productCategory.findMany({
    include: { subcategories: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ categories });
}

// POST /api/v1/products — create category + subcategories
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const category = await prisma.productCategory.create({
    data: {
      slug: body.slug,
      name: body.name,
      emoji: body.emoji || "",
      intent: body.intent || "",
      url: body.url || "",
      order: body.order ?? 0,
      isActive: body.isActive ?? true,
      subcategories: {
        create: (body.subcategories ?? []).map(
          (sub: { slug: string; name: string; url: string }, i: number) => ({
            slug: sub.slug,
            name: sub.name,
            url: sub.url || "",
            order: i,
          })
        ),
      },
    },
    include: { subcategories: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ category }, { status: 201 });
}
