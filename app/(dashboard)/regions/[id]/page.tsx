import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { RegionForm } from "@/components/regions/RegionForm";

export const dynamic = "force-dynamic";

export default async function RegionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "new") {
    return (
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-6">新增地區</h1>
        <RegionForm />
      </div>
    );
  }

  const region = await prisma.region.findUnique({ where: { id } });
  if (!region) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-6">編輯地區</h1>
      <RegionForm region={region} />
    </div>
  );
}
