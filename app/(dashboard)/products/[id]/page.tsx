import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/products/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "new") {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-100 mb-6">新增產品分類</h1>
        <ProductForm />
      </div>
    );
  }

  const category = await prisma.productCategory.findUnique({
    where: { id },
    include: { subcategories: { orderBy: { order: "asc" } } },
  });

  if (!category) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-100 mb-6">
        編輯：{category.emoji} {category.name}
      </h1>
      <ProductForm category={category} />
    </div>
  );
}
