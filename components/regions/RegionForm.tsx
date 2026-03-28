"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Region } from "@prisma/client";

export function RegionForm({ region }: { region?: Region }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: region?.name ?? "",
    slug: region?.slug ?? "",
    counties: region?.counties?.join("、") ?? "",
    order: region?.order ?? 0,
    isActive: region?.isActive ?? true,
  });

  function update(field: string, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function autoSlug(name: string) {
    update("name", name);
    if (!region) {
      // Auto-generate slug for new regions only
      const slugMap: Record<string, string> = {
        "大台北桃園宜蘭": "north",
        "竹苗": "hsinchu-miaoli",
        "中彰投雲": "central",
        "嘉南": "chiayi-tainan",
        "高屏台東": "south",
        "花蓮": "hualien",
      };
      const match = Object.entries(slugMap).find(([k]) => name.includes(k));
      if (match) update("slug", match[1]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name: form.name,
      slug: form.slug,
      counties: form.counties
        .split(/[,、，]/)
        .map((c) => c.trim())
        .filter(Boolean),
      order: form.order,
      isActive: form.isActive,
    };

    const url = region
      ? "/api/v1/regions/" + region.id
      : "/api/v1/regions";
    const method = region ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (res.ok) {
      router.push("/regions");
      router.refresh();
    }
  }

  const inputClass =
    "w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]";
  const labelClass = "block text-sm text-[var(--text-secondary)] mb-1";

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-6 space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>地區名稱 *</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => autoSlug(e.target.value)}
            required
            placeholder="例：大台北桃園宜蘭"
          />
        </div>
        <div>
          <label className={labelClass}>代碼 (slug) *</label>
          <input
            className={inputClass}
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            required
            placeholder="例：north"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>包含縣市（用頓號分隔）</label>
        <input
          className={inputClass}
          value={form.counties}
          onChange={(e) => update("counties", e.target.value)}
          placeholder="例：台北市、新北市、桃園市、宜蘭縣"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>排序</label>
          <input
            type="number"
            className={inputClass}
            value={form.order}
            onChange={(e) => update("order", parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
            className="accent-amber-500"
          />
          <label className="text-sm text-[var(--text-secondary)]">啟用</label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-[var(--brand-primary)] hover:bg-[var(--text-secondary)] text-white px-6 py-2 rounded-lg font-bold transition disabled:opacity-50"
        >
          {loading ? "儲存中..." : "儲存"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/regions")}
          className="bg-[var(--border-strong)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-6 py-2 rounded-lg transition"
        >
          取消
        </button>
      </div>
    </form>
  );
}
