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
  line_oa_id_production: "正式環境的 LINE 官方帳號 ID（@xxx 格式）",
  line_oa_id_test: "測試環境的 LINE 官方帳號 ID（@xxx 格式）",
  line_oa_url_production: "正式環境加好友連結",
  line_oa_url_test: "測試環境加好友連結",
  line_active_env: "目前使用的環境：production 或 test",
  referral_brand_name: "推薦卡片上顯示的品牌名稱",
  referral_share_text:
    "推薦分享訊息模板（可用變數：{brand}、{code}、{url}）",
  flex_brand_color: "Flex 訊息按鈕和標題的品牌色",
  flex_brand_name: "Flex 訊息中的品牌名稱",
  flex_welcome_title: "Day0 歡迎訊息的副標題",
  flex_welcome_body: "Day0 歡迎訊息的內文",
  flex_day3_title: "Day3 品類教育訊息的標題",
  flex_day3_body: "Day3 品類教育訊息的內文",
  flex_day30_title: "Day30 追蹤訊息的標題",
  flex_day30_body: "Day30 追蹤訊息的內文",
  flex_repair_phone: "維修服務的客服電話",
  flex_repair_hours: "維修服務的服務時間",
  alert_line_user_ids: "接收通知的管理員 LINE User IDs（逗號分隔）",
};

// Human-readable labels for settings keys
const LABELS: Record<string, string> = {
  welcome_message: "加好友歡迎訊息",
  fallback_message: "系統忙碌提示",
  region_menu_title: "地區選單標題",
  no_store_message: "無門市提示",
  store_intro_prefix: "門市卡片前綴文字",
  line_oa_id_production: "正式 LINE@ ID",
  line_oa_id_test: "測試 LINE@ ID",
  line_oa_url_production: "正式加好友連結",
  line_oa_url_test: "測試加好友連結",
  line_active_env: "目前環境",
  referral_brand_name: "推薦品牌名稱",
  referral_share_text: "推薦分享訊息",
  flex_brand_color: "品牌色",
  flex_brand_name: "品牌名稱",
  flex_welcome_title: "歡迎訊息標題",
  flex_welcome_body: "歡迎訊息內文",
  flex_day3_title: "Day3 訊息標題",
  flex_day3_body: "Day3 訊息內文",
  flex_day30_title: "Day30 訊息標題",
  flex_day30_body: "Day30 訊息內文",
  flex_repair_phone: "維修客服電話",
  flex_repair_hours: "維修服務時間",
  alert_line_user_ids: "通知管理員 LINE User IDs",
};

// Default values for new settings
const DEFAULTS: Record<string, string> = {
  line_active_env: "production",
  line_oa_id_production: "",
  line_oa_id_test: "",
  line_oa_url_production: "",
  line_oa_url_test: "",
  referral_brand_name: "DEREK 德瑞克衛浴",
  referral_share_text:
    "🤝 {brand} — 好友推薦\n\n我的推薦碼：{code}\n\n👉 點擊加入並自動輸入推薦碼：\n{url}",
  flex_brand_color: "#B89A6A",
  flex_brand_name: "DEREK 德瑞克衛浴",
  flex_welcome_title: "",
  flex_welcome_body: "",
  flex_day3_title: "",
  flex_day3_body: "",
  flex_day30_title: "",
  flex_day30_body: "",
  flex_repair_phone: "",
  flex_repair_hours: "",
};

// Group settings by category
const GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "🔗 LINE 官方帳號",
    keys: [
      "line_active_env",
      "line_oa_id_production",
      "line_oa_url_production",
      "line_oa_id_test",
      "line_oa_url_test",
    ],
  },
  {
    title: "💬 Bot 訊息設定",
    keys: [
      "welcome_message",
      "fallback_message",
      "region_menu_title",
      "no_store_message",
      "store_intro_prefix",
    ],
  },
  {
    title: "🤝 推薦系統",
    keys: ["referral_brand_name", "referral_share_text"],
  },
  {
    title: "🎨 Flex 訊息模板",
    keys: [
      "flex_brand_color",
      "flex_brand_name",
      "flex_welcome_title",
      "flex_welcome_body",
      "flex_day3_title",
      "flex_day3_body",
      "flex_day30_title",
      "flex_day30_body",
      "flex_repair_phone",
      "flex_repair_hours",
    ],
  },
];

export function SettingsForm({ settings }: { settings: SiteSetting[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Build a map of existing settings
  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s]));

  // Collect ALL keys: grouped + ungrouped from DB
  const allGroupedKeys = new Set(GROUPS.flatMap((g) => g.keys));

  // Initialize values: existing DB values + defaults for missing keys
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    // Add all existing settings
    for (const s of settings) {
      initial[s.key] = s.value;
    }
    // Add defaults for grouped keys not in DB
    for (const key of allGroupedKeys) {
      if (!(key in initial)) {
        initial[key] = DEFAULTS[key] ?? "";
      }
    }
    return initial;
  });

  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Send ALL keys (both existing and new)
    const payload = Object.entries(values).map(([key, value]) => ({
      key,
      value: value ?? "",
      label: LABELS[key] || key,
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
    "w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)] text-sm";

  // Ungrouped settings from DB
  const ungrouped = settings.filter((s) => !allGroupedKeys.has(s.key));

  function renderField(key: string) {
    const isColor = key.includes("color");
    const isEnv = key === "line_active_env";
    const label = LABELS[key] || settingMap[key]?.label || key;
    const value = values[key] ?? "";

    return (
      <div key={key} className="py-3">
        <div className="flex items-center gap-2 mb-1">
          <label className="text-sm font-medium text-[var(--brand-accent)]">
            {label}
          </label>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            {key}
          </span>
        </div>
        {DESCRIPTIONS[key] && (
          <p className="text-xs text-[var(--text-muted)] mb-2">
            {DESCRIPTIONS[key]}
          </p>
        )}
        {isEnv ? (
          <div className="flex gap-2">
            {["production", "test"].map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => update(key, env)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                  value === env
                    ? env === "production"
                      ? "bg-green-700 text-white"
                      : "bg-yellow-700 text-white"
                    : "bg-[var(--bg-tertiary)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {env === "production" ? "🟢 正式環境" : "🟡 測試環境"}
              </button>
            ))}
          </div>
        ) : isColor ? (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={value || "#B89A6A"}
              onChange={(e) => update(key, e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-[var(--border-strong)]"
            />
            <input
              className={inputClass + " flex-1"}
              value={value}
              onChange={(e) => update(key, e.target.value)}
              placeholder="#B89A6A"
            />
            <div
              className="w-20 h-10 rounded-lg border border-[var(--border-strong)]"
              style={{ backgroundColor: value || "#B89A6A" }}
            />
          </div>
        ) : (value?.length ?? 0) > 60 ||
          key.includes("_text") ||
          key.includes("_body") ? (
          <textarea
            className={inputClass + " h-28 resize-none"}
            value={value}
            onChange={(e) => update(key, e.target.value)}
            placeholder={DEFAULTS[key] || ""}
          />
        ) : (
          <input
            className={inputClass}
            value={value}
            onChange={(e) => update(key, e.target.value)}
            placeholder={DEFAULTS[key] || ""}
          />
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <p className="text-sm text-[var(--text-muted)]">
        以下設定會即時反映到 LINE Bot 的回覆內容。修改後儲存即可生效。
      </p>

      {GROUPS.map((group) => (
        <div
          key={group.title}
          className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-5"
        >
          <h2 className="text-sm font-bold text-[var(--text-secondary)] mb-1 pb-2 border-b border-[var(--border-strong)]">
            {group.title}
          </h2>
          <div className="divide-y divide-[var(--border-subtle)]">
            {group.keys.map((key) => renderField(key))}
          </div>
        </div>
      ))}

      {/* Ungrouped settings from DB */}
      {ungrouped.length > 0 && (
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-5">
          <h2 className="text-sm font-bold text-[var(--text-secondary)] mb-1 pb-2 border-b border-[var(--border-strong)]">
            📋 其他設定
          </h2>
          <div className="divide-y divide-[var(--border-subtle)]">
            {ungrouped.map((s) => renderField(s.key))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-[var(--brand-primary)] hover:bg-[var(--text-secondary)] text-white px-6 py-2.5 rounded-lg font-bold transition disabled:opacity-50"
        >
          {loading ? "儲存中..." : "💾 儲存所有設定"}
        </button>
        {saved && (
          <span className="text-emerald-500 text-sm font-medium">
            ✅ 已儲存，LINE Bot 即時生效
          </span>
        )}
      </div>
    </form>
  );
}
