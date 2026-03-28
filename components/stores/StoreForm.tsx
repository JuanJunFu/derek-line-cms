"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Store, Region } from "@prisma/client";
import { ImageUpload } from "@/components/ui/ImageUpload";

const STORE_TYPES = [
  { value: "FLAGSHIP", label: "旗艦門市" },
  { value: "BRANCH", label: "分公司" },
  { value: "DEALER", label: "授權經銷商" },
  { value: "GENERAL", label: "總經銷" },
];

export function StoreForm({
  store,
  regions,
}: {
  store?: Store;
  regions: Region[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: store?.name ?? "",
    type: store?.type ?? "FLAGSHIP",
    regionId: store?.regionId ?? regions[0]?.id ?? "",
    address: store?.address ?? "",
    phone: store?.phone ?? "",
    lineId: store?.lineId ?? "",
    hours: store?.hours ?? "",
    imageUrl: store?.imageUrl ?? "",
    googleMapUrl: store?.googleMapUrl ?? "",
    description: store?.description ?? "",
    isActive: store?.isActive ?? true,
    order: store?.order ?? 0,
  });

  function update(field: string, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const url = store
      ? `/api/v1/stores/${store.id}`
      : "/api/v1/stores";
    const method = store ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/stores");
      router.refresh();
    }
  }

  const inputClass =
    "w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]";
  const labelClass = "block text-sm text-[var(--text-secondary)] mb-1";

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-full lg:max-w-2xl bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-6 space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>門市名稱 *</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>類型 *</label>
          <select
            className={inputClass}
            value={form.type}
            onChange={(e) => update("type", e.target.value)}
          >
            {STORE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>所屬地區 *</label>
          <select
            className={inputClass}
            value={form.regionId}
            onChange={(e) => update("regionId", e.target.value)}
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>排序</label>
          <input
            type="number"
            className={inputClass}
            value={form.order}
            onChange={(e) => update("order", parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>地址 *</label>
        <input
          className={inputClass}
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>電話 *</label>
          <input
            className={inputClass}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>營業時間 *</label>
          <input
            className={inputClass}
            value={form.hours}
            onChange={(e) => update("hours", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>門市 LINE ID</label>
          <input
            className={inputClass}
            value={form.lineId}
            onChange={(e) => update("lineId", e.target.value)}
            placeholder="@xxx"
          />
        </div>
        <div>
          <label className={labelClass}>門市圖片</label>
          <ImageUpload
            value={form.imageUrl}
            onChange={(url) => update("imageUrl", url)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Google Maps URL</label>
        <input
          className={inputClass}
          value={form.googleMapUrl}
          onChange={(e) => update("googleMapUrl", e.target.value)}
          placeholder="https://maps.google.com/..."
        />
      </div>

      <div>
        <label className={labelClass}>描述</label>
        <textarea
          className={inputClass + " h-20 resize-none"}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => update("isActive", e.target.checked)}
          className="accent-amber-500"
        />
        <label className="text-sm text-[var(--text-secondary)]">啟用</label>
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
          onClick={() => router.push("/stores")}
          className="bg-[var(--border-strong)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-6 py-2 rounded-lg transition"
        >
          取消
        </button>
      </div>
    </form>
  );
}
