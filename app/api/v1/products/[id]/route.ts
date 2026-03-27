import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/v1/products/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const category = await prisma.productCategory.findUnique({
    where: { id },
    include: { subcategories: { orderBy: { order: "asc" } } },
  });
  if (!category) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ category });
}

// PUT /api/v1/products/[id] — update category + replace subcategories
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Delete old subcategories and create new ones in a transaction
  const category = await prisma.$transaction(async (tx) => {
    await tx.productSubcategory.deleteMany({ where: { categoryId: id } });
    return tx.productCategory.update({
      where: { id },
      data: {
        slug: body.slug,
        name: body.name,
        emoji: body.emoji || "",
        intent: body.intent || "",
        url: body.url || "",
        order: body.order ?? 0,
        isActive: body.isActive,
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
  });

  return NextResponse.json({ category });
}

// PATCH /api/v1/products/[id] — toggle active
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const category = await prisma.productCategory.update({
    where: { id },
    data: { isActive: body.isActive },
  });

  return NextResponse.json({ category });
}

// DELETE /api/v1/products/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.productCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
