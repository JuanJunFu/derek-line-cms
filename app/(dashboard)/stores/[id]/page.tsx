import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StoreForm } from "@/components/stores/StoreForm";

export const dynamic = "force-dynamic";

export default async function StoreEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const regions = await prisma.region.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  if (id === "new") {
    return (
      <div>
        <h1 className="text-xl font-bold text-gray-100 mb-6">新增門市</h1>
        <StoreForm regions={regions} />
      </div>
    );
  }

  const store = await prisma.store.findUnique({ where: { id } });
  if (!store) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-100 mb-6">編輯門市</h1>
      <StoreForm store={store} regions={regions} />
    </div>
  );
}
