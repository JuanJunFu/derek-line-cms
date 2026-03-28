"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Sub = { slug: string; name: string; url: string };

type Category = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  intent: string;
  url: string;
  order: number;
  isActive: boolean;
  subcategories: { id: string; slug: string; name: string; url: string; order: number }[];
};

const INTENT_OPTIONS = [
  { value: "", label: "（無）" },
  { value: "Comfort_High", label: "Comfort_High（馬桶/免治）" },
  { value: "Storage_Space", label: "Storage_Space（浴櫃/面盆）" },
  { value: "Quick_Fix", label: "Quick_Fix（龍頭）" },
  { value: "Luxury_Living", label: "Luxury_Living（浴缸/高端）" },
  { value: "Safety_Care", label: "Safety_Care（無障礙）" },
  { value: "Maintenance", label: "Maintenance（配件/維修）" },
];

export function ProductForm({ category }: { category?: Category }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    slug: category?.slug ?? "",
    name: category?.name ?? "",
    emoji: category?.emoji ?? "",
    intent: category?.intent ?? "",
    url: category?.url ?? "",
    order: category?.order ?? 0,
    isActive: category?.isActive ?? true,
  });
  const [subs, setSubs] = useState<Sub[]>(
    category?.subcategories.map((s) => ({
      slug: s.slug,
      name: s.name,
      url: s.url,
    })) ?? []
  );

  function update(field: string, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateSub(index: number, field: keyof Sub, value: string) {
    setSubs((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function addSub() {
    setSubs((prev) => [...prev, { slug: "", name: "", url: "" }]);
  }

  function removeSub(index: number) {
    setSubs((prev) => prev.filter((_, i) => i !== index));
  }

  function moveSub(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= subs.length) return;
    setSubs((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = { ...form, subcategories: subs };
    const url = category
      ? `/api/v1/products/${category.id}`
      : "/api/v1/products";
    const method = category ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (res.ok) {
      router.push("/products");
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!category || !confirm("確定要刪除此分類？所有子分類也會一併刪除。")) return;
    const res = await fetch(`/api/v1/products/${category.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/products");
      router.refresh();
    }
  }

  const inputClass =
    "w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]";
  const labelClass = "block text-sm text-[var(--text-secondary)] mb-1";

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-full lg:max-w-3xl bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-6 space-y-5"
    >
      {/* Basic info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Emoji</label>
          <input
            className={inputClass}
            value={form.emoji}
            onChange={(e) => update("emoji", e.target.value)}
            placeholder="🚽"
          />
        </div>
        <div>
          <label className={labelClass}>名稱 *</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            placeholder="馬桶"
          />
        </div>
        <div>
          <label className={labelClass}>代碼 (slug) *</label>
          <input
            className={inputClass}
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            required
            placeholder="toilet"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>意圖標籤 (Intent)</label>
          <select
            className={inputClass}
            value={form.intent}
            onChange={(e) => update("intent", e.target.value)}
          >
            {INTENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>官網連結</label>
          <input
            className={inputClass}
            value={form.url}
            onChange={(e) => update("url", e.target.value)}
            placeholder="https://www.lcb.com.tw/lcb/Apro"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>排序（數字越小越前面）</label>
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
            className="accent-[var(--brand-accent)]"
          />
          <label className="text-sm text-[var(--text-secondary)]">啟用（LINE Bot 選單中顯示）</label>
        </div>
      </div>

      {/* Subcategories */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-bold text-[var(--text-secondary)]">
            子分類（{subs.length}）
          </label>
          <button
            type="button"
            onClick={addSub}
            className="text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--border-strong)] text-[var(--brand-accent)] px-3 py-1 rounded transition"
          >
            ＋ 新增子分類
          </button>
        </div>

        {subs.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] italic">
            無子分類時，LINE Bot 會直接導向官網連結
          </p>
        )}

        <div className="space-y-2">
          {subs.map((sub, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-[var(--bg-tertiary)]/50 rounded-lg p-2"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveSub(i, -1)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs leading-none"
                  disabled={i === 0}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveSub(i, 1)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs leading-none"
                  disabled={i === subs.length - 1}
                >
                  ▼
                </button>
              </div>
              <input
                className="flex-1 px-2 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                value={sub.name}
                onChange={(e) => updateSub(i, "name", e.target.value)}
                placeholder="子分類名稱"
              />
              <input
                className="w-32 px-2 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                value={sub.slug}
                onChange={(e) => updateSub(i, "slug", e.target.value)}
                placeholder="slug"
              />
              <input
                className="flex-1 px-2 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                value={sub.url}
                onChange={(e) => updateSub(i, "url", e.target.value)}
                placeholder="官網連結 URL"
              />
              <button
                type="button"
                onClick={() => removeSub(i)}
                className="text-red-600 hover:text-red-600 text-sm px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
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
          onClick={() => router.push("/products")}
          className="bg-[var(--border-strong)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-6 py-2 rounded-lg transition"
        >
          取消
        </button>
        {category && (
          <button
            type="button"
            onClick={handleDelete}
            className="ml-auto text-red-600 hover:text-red-600 text-sm"
          >
            刪除此分類
          </button>
        )}
      </div>
    </form>
  );
}
