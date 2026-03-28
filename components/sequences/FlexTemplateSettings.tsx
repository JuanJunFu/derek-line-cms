"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TEMPLATE_FIELDS: {
  group: string;
  icon: string;
  fields: { key: string; label: string; desc: string; type: "text" | "textarea" | "color" | "phone" }[];
}[] = [
  {
    group: "🎨 品牌設定",
    icon: "🎨",
    fields: [
      { key: "flex_brand_color", label: "品牌主色", desc: "所有 Flex 訊息的按鈕和標題顏色", type: "color" },
      { key: "flex_brand_name", label: "品牌名稱", desc: "所有 Flex 訊息中顯示的品牌名稱", type: "text" },
    ],
  },
  {
    group: "👋 Day0 歡迎訊息",
    icon: "👋",
    fields: [
      { key: "flex_welcome_title", label: "副標題", desc: "品牌名稱下方的副標題文字", type: "text" },
      { key: "flex_welcome_body", label: "歡迎內文", desc: "歡迎卡片的主要說明文字", type: "textarea" },
    ],
  },
  {
    group: "📚 Day3 品類教育",
    icon: "📚",
    fields: [
      { key: "flex_day3_title", label: "標題", desc: "品類教育卡片的標題", type: "text" },
      { key: "flex_day3_body", label: "說明文字", desc: "品類教育卡片的說明", type: "textarea" },
    ],
  },
  {
    group: "📋 Day30 追蹤",
    icon: "📋",
    fields: [
      { key: "flex_day30_title", label: "標題", desc: "追蹤訊息卡片的標題", type: "text" },
      { key: "flex_day30_body", label: "說明文字", desc: "追蹤訊息卡片的說明", type: "textarea" },
    ],
  },
  {
    group: "🔧 維修服務",
    icon: "🔧",
    fields: [
      { key: "flex_repair_phone", label: "客服電話", desc: "維修服務卡片上顯示的客服電話", type: "phone" },
      { key: "flex_repair_hours", label: "服務時間", desc: "維修服務卡片上顯示的服務時間", type: "text" },
    ],
  },
];

const DEFAULTS: Record<string, string> = {
  flex_brand_color: "#B89A6A",
  flex_brand_name: "DEREK 德瑞克衛浴",
  flex_welcome_title: "打造理想衛浴空間",
  flex_welcome_body: "感謝您加入官方帳號！我們提供完整的衛浴產品與服務，從選購、安裝到售後維修，全程為您服務。",
  flex_day3_title: "🏠 衛浴怎麼選？",
  flex_day3_body: "不同需求有不同重點，3分鐘了解衛浴產品怎麼挑",
  flex_day30_title: "找到理想的衛浴了嗎？",
  flex_day30_body: "我們注意到您之前對衛浴產品有興趣，想確認是否還需要任何協助？",
  flex_repair_phone: "0800-123-456",
  flex_repair_hours: "週一至週五 09:00-18:00",
};

export function FlexTemplateSettings({
  initialValues,
}: {
  initialValues: Record<string, string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const merged: Record<string, string> = {};
    for (const group of TEMPLATE_FIELDS) {
      for (const f of group.fields) {
        merged[f.key] = initialValues[f.key] ?? DEFAULTS[f.key] ?? "";
      }
    }
    return merged;
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(true);

  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setLoading(true);
    const payload = Object.entries(values).map(([key, value]) => ({
      key,
      value: value ?? "",
      label: TEMPLATE_FIELDS.flatMap((g) => g.fields).find((f) => f.key === key)?.label || key,
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

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            ✏️ Flex 模板內容設定
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            修改內建序列（歡迎/品類教育/追蹤/維修）的 Flex 訊息文字內容
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-accent)] transition px-3 py-1 rounded-lg border border-[var(--border-strong)]"
        >
          {expanded ? "▼ 收起" : "▶ 展開設定"}
        </button>
      </div>

      {expanded && (
        <div className="space-y-5">
          {TEMPLATE_FIELDS.map((group) => (
            <div key={group.group}>
              <h3 className="text-xs font-bold text-[var(--text-secondary)] mb-2 pb-1 border-b border-[var(--border-subtle)]">
                {group.group}
              </h3>
              <div className="space-y-3">
                {group.fields.map((field) => {
                  const value = values[field.key] ?? "";
                  return (
                    <div key={field.key}>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-sm font-medium text-[var(--brand-accent)]">
                          {field.label}
                        </label>
                        <span className="text-xs font-mono text-[var(--text-muted)]">
                          {field.key}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mb-1">
                        {field.desc}
                      </p>
                      {field.type === "color" ? (
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={value || "#B89A6A"}
                            onChange={(e) => update(field.key, e.target.value)}
                            className="w-10 h-10 rounded cursor-pointer border border-[var(--border-strong)]"
                          />
                          <input
                            className={inputClass + " flex-1"}
                            value={value}
                            onChange={(e) => update(field.key, e.target.value)}
                            placeholder={DEFAULTS[field.key]}
                          />
                          <div
                            className="w-20 h-10 rounded-lg border border-[var(--border-strong)]"
                            style={{ backgroundColor: value || "#B89A6A" }}
                          />
                        </div>
                      ) : field.type === "textarea" ? (
                        <textarea
                          className={inputClass + " h-20 resize-none"}
                          value={value}
                          onChange={(e) => update(field.key, e.target.value)}
                          placeholder={DEFAULTS[field.key]}
                        />
                      ) : (
                        <input
                          className={inputClass}
                          value={value}
                          onChange={(e) => update(field.key, e.target.value)}
                          placeholder={DEFAULTS[field.key]}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-4 pt-3 border-t border-[var(--border-subtle)]">
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-[var(--brand-primary)] hover:bg-[var(--text-secondary)] text-white px-5 py-2 rounded-lg font-bold text-sm transition disabled:opacity-50"
            >
              {loading ? "儲存中..." : "💾 儲存模板設定"}
            </button>
            {saved && (
              <span className="text-emerald-500 text-sm font-medium">
                ✅ 已儲存，下次發送序列訊息即生效
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
