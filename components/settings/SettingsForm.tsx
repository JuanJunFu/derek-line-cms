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
  line_oa_id_production: "正式環境的 LINE 官方帳號 ID（推薦碼分享連結會使用此 ID）",
  line_oa_id_test: "測試環境的 LINE 官方帳號 ID",
  line_active_env: "切換正式/測試環境，影響 Bot 使用的 LINE 帳號和推薦連結",
  referral_brand_name: "推薦卡片上顯示的品牌名稱",
  referral_share_text: "推薦分享訊息模板（可用變數：{brand}、{code}、{url}）",
  flex_brand_color: "所有 Flex 訊息的按鈕和標題顏色",
  flex_brand_name: "所有 Flex 訊息中顯示的品牌名稱",
  alert_line_user_ids: "接收系統通知的管理員 LINE User IDs（逗號分隔多位）",
  area_managers: "點擊橫幅後顯示的區域負責人名單，JSON 格式，每筆包含 label（姓名/職稱）、area（地區）、lineUri（LINE 連結）",
  repair_line_message: "點擊「發送諮詢訊息」時預填到 LINE 的文字內容",
  friends_intro_message: "點擊橫幅後、名片上方的引導文字",
  repair_store_intro: "選擇維修地區後、門市卡片上方的引導文字（{region} 會被替換為地區名稱）",
};

const LABELS: Record<string, string> = {
  welcome_message: "加好友歡迎訊息",
  fallback_message: "系統忙碌提示",
  region_menu_title: "地區選單標題",
  no_store_message: "無門市提示",
  store_intro_prefix: "門市卡片前綴文字",
  line_oa_id_production: "正式 LINE@ ID",
  line_oa_id_test: "測試 LINE@ ID",
  line_active_env: "目前環境",
  referral_brand_name: "推薦品牌名稱",
  referral_share_text: "推薦分享訊息",
  flex_brand_color: "品牌色",
  flex_brand_name: "品牌名稱",
  alert_line_user_ids: "通知管理員 LINE User IDs",
  area_managers: "區域負責人名單",
  repair_line_message: "維修預填訊息",
  friends_intro_message: "橫幅點擊引導文字",
  repair_store_intro: "維修門市引導文字",
};

// Pre-filled defaults for DEREK 德瑞克衛浴
const DEFAULTS: Record<string, string> = {
  line_active_env: "production",
  line_oa_id_production: "@417cnroq",
  line_oa_id_test: "@897utgnk",
  referral_brand_name: "DEREK 德瑞克衛浴",
  referral_share_text:
    "🤝 DEREK 德瑞克衛浴 — 好友推薦\n\n我的推薦碼：{code}\n\n👉 點擊加入並自動輸入推薦碼：\n{url}",
  flex_brand_color: "#B89A6A",
  flex_brand_name: "DEREK 德瑞克衛浴",
  welcome_message:
    "親愛的顧客您好 👋 感謝您加入 DEREK 德瑞克衛浴！請點選下方選單「尋找門市」找到您附近的服務據點，或輸入「產品」瀏覽完整產品目錄 🛁",
  fallback_message: "系統暫時忙碌，請稍後再試 🙏",
  region_menu_title: "📍 請選擇您所在的地區",
  no_store_message: "該地區目前沒有服務據點，請聯繫客服 📞",
  store_intro_prefix: "以下是 {region} 的服務據點 👇",
};

// Simplified groups — removed unused URL fields and moved sequence content to 序列管理
const GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "🔗 LINE 官方帳號",
    keys: ["line_active_env", "line_oa_id_production", "line_oa_id_test"],
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
    title: "🎨 品牌外觀",
    keys: ["flex_brand_color", "flex_brand_name"],
  },
  {
    title: "📞 區域負責人聯絡",
    keys: [
      "friends_intro_message",
      "repair_store_intro",
      "repair_line_message",
      "area_managers",
    ],
  },
];

export function SettingsForm({ settings }: { settings: SiteSetting[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s]));
  const allGroupedKeys = new Set(GROUPS.flatMap((g) => g.keys));

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const s of settings) {
      initial[s.key] = s.value;
    }
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

  const ungrouped = settings.filter((s) => !allGroupedKeys.has(s.key));

  function renderField(key: string) {
    const isColor = key.includes("color");
    const isEnv = key === "line_active_env";
    const isJson = key === "area_managers";
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
        {isJson ? (
          <div>
            <textarea
              className={inputClass + " h-48 resize-y font-mono text-xs"}
              value={value}
              onChange={(e) => update(key, e.target.value)}
              placeholder='[{"label":"北區負責人","area":"台北 / 新北","lineUri":"https://line.me/ti/p/xxx"}]'
              spellCheck={false}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              每筆格式：<code className="font-mono bg-[var(--bg-tertiary)] px-1 rounded">{"{"}"label":"XX區負責人","area":"地區","lineUri":"https://..."{"}"}</code>
            </p>
          </div>
        ) : isEnv ? (
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

      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] p-4">
        <p className="text-xs text-[var(--text-muted)] mb-2">
          💡 序列訊息內容（Day0 歡迎 / Day3 品類教育 / Day30 追蹤 / 維修服務）請至
          <a href="/sequences" className="text-[var(--brand-accent)] hover:underline ml-1">📬 序列管理</a>
          中編輯。
        </p>
      </div>

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
