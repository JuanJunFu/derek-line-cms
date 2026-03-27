import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ProductToggle } from "@/components/products/ProductToggle";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const categories = await prisma.productCategory.findMany({
    include: { subcategories: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-100">產品分類管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理 LINE Bot 產品選單的分類與子分類
          </p>
        </div>
        <Link
          href="/products/new"
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
        >
          ＋ 新增分類
        </Link>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-gray-900 rounded-xl border border-gray-800 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-gray-100 font-bold">{cat.name}</h2>
                    <span className="text-xs text-gray-500 font-mono">
                      {cat.slug}
                    </span>
                    {cat.intent && (
                      <span className="text-xs bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded">
                        {cat.intent}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {cat.subcategories.length} 個子分類
                    {cat.url && (
                      <>
                        {" "}
                        &middot;{" "}
                        <a
                          href={cat.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-600 hover:text-amber-500"
                        >
                          官網連結
                        </a>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ProductToggle id={cat.id} isActive={cat.isActive} />
                <Link
                  href={`/products/${cat.id}`}
                  className="text-amber-500 hover:text-amber-400 text-sm font-medium"
                >
                  編輯
                </Link>
              </div>
            </div>

            {cat.subcategories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {cat.subcategories.map((sub) => (
                  <span
                    key={sub.id}
                    className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded"
                  >
                    {sub.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            尚無產品分類，請點擊右上角新增
          </div>
        )}
      </div>
    </div>
  );
}
