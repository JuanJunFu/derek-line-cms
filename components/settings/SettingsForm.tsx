"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteSetting } from "@prisma/client";

const DESCRIPTIONS: Record<string, string> = {
  welcome_message: "用戶加好友時收到的第一則訊息",
  fallback_message: "系統發生錯誤時的備用回覆",
  region_menu_title: "地區選單上方的標題文字",
  no_store_message: "選擇地區後若沒有門市時的提示",
  store_intro_prefix: "門市卡片上方的引導文字（{region} 會被替換為地區名稱）",
};

export function SettingsForm({ settings }: { settings: SiteSetting[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value]))
  );

  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = settings.map((s) => ({
      key: s.key,
      value: values[s.key],
    }));

    const res = await fetch("/api/v1/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: payload }),
    });

    setLoading(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    }
  }

  const inputClass =
    "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-amber-500";

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-6"
    >
      {settings.map((s) => (
        <div
          key={s.key}
          className="bg-gray-900 rounded-xl border border-gray-800 p-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <label className="text-sm font-medium text-amber-500">
              {s.label}
            </label>
            <span className="text-xs font-mono text-gray-600">{s.key}</span>
          </div>
          {DESCRIPTIONS[s.key] && (
            <p className="text-xs text-gray-500 mb-3">
              {DESCRIPTIONS[s.key]}
            </p>
          )}
          {(values[s.key]?.length ?? 0) > 60 ? (
            <textarea
              className={inputClass + " h-28 resize-none"}
              value={values[s.key]}
              onChange={(e) => update(s.key, e.target.value)}
            />
          ) : (
            <input
              className={inputClass}
              value={values[s.key]}
              onChange={(e) => update(s.key, e.target.value)}
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg font-bold transition disabled:opacity-50"
        >
          {loading ? "儲存中..." : "儲存所有設定"}
        </button>
        {saved && (
          <span className="text-green-400 text-sm">✓ 已儲存，LINE Bot 即時生效</span>
        )}
      </div>
    </form>
  );
}
