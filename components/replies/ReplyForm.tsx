"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AutoReply } from "@prisma/client";

export function ReplyForm({ reply }: { reply?: AutoReply }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    keyword: reply?.keyword ?? "",
    message: reply?.message ?? "",
    order: reply?.order ?? 0,
    isActive: reply?.isActive ?? true,
  });

  function update(field: string, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      keyword: form.keyword || null,
      message: form.message,
      order: form.order,
      isActive: form.isActive,
    };

    const url = reply
      ? "/api/v1/replies/" + reply.id
      : "/api/v1/replies";
    const method = reply ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (res.ok) {
      router.push("/replies");
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
      <div>
        <label className={labelClass}>
          關鍵字（留空 = 預設回覆，無匹配時觸發）
        </label>
        <input
          className={inputClass}
          value={form.keyword}
          onChange={(e) => update("keyword", e.target.value)}
          placeholder="例：門市、地址、營業時間"
        />
      </div>

      <div>
        <label className={labelClass}>回覆內容 *</label>
        <textarea
          className={inputClass + " h-32 resize-none"}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          required
          placeholder="回覆文字訊息，或輸入系統指令"
        />
        {form.message === "SHOW_REGION_MENU" && (
          <p className="text-xs text-[var(--brand-accent)] mt-1">
            系統指令：收到此關鍵字時，會自動顯示地區選單（非文字回覆）
          </p>
        )}
        {form.message === "SHOW_PRODUCT_MENU" && (
          <p className="text-xs text-[var(--brand-accent)] mt-1">
            系統指令：收到此關鍵字時，會自動顯示產品分類選單（非文字回覆）
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => update("message", "SHOW_REGION_MENU")}
            className="text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--border-strong)] text-[var(--brand-accent)] px-2 py-1 rounded transition"
          >
            插入：顯示地區選單
          </button>
          <button
            type="button"
            onClick={() => update("message", "SHOW_PRODUCT_MENU")}
            className="text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--border-strong)] text-[var(--brand-accent)] px-2 py-1 rounded transition"
          >
            插入：顯示產品選單
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>排序（數字越小越優先）</label>
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
          onClick={() => router.push("/replies")}
          className="bg-[var(--border-strong)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-6 py-2 rounded-lg transition"
        >
          取消
        </button>
      </div>
    </form>
  );
}
