"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Auto-upgrade rules — must match lib/tracking.ts + lib/constants.ts
const AUTO_RULES = [
  {
    icon: "🔧",
    label: "維修關鍵字",
    desc: "用戶提到「維修、漏水、故障、壞了、修理、零件、損壞、不出水」→ 自動升為熟客",
    check: (tags: string[]) => tags.includes("Role:Service_Needed"),
  },
  {
    icon: "📊",
    label: "關係分 ≥ 41（熟識）",
    desc: "透過互動累積關係分到 41 分以上（等級：熟識）→ 建議升為熟客",
    check: (_tags: string[], score: number) => score >= 41,
  },
  {
    icon: "🔥",
    label: "高購買意圖",
    desc: "致電門市、導航門市、LINE 聯繫門市 → HOT 狀態，建議升為熟客",
    check: (tags: string[]) => tags.includes("Status:High_Purchase_Intent"),
  },
  {
    icon: "🎯",
    label: "完成新客教育序列",
    desc: "Day0→Day3→Day7→Day30 序列全部完成 → 建議升為熟客",
    check: (_tags: string[], _score: number, _events: number) => false, // checked via sequenceState in server
  },
];

// Relationship score earning rules
const SCORE_RULES = [
  { action: "瀏覽產品", score: "+5", cap: "（上限 20 分）" },
  { action: "選擇地區", score: "+10", cap: "" },
  { action: "致電/導航/LINE 門市", score: "+15", cap: "" },
  { action: "完成新客序列", score: "+20", cap: "" },
  { action: "維修詢問", score: "+25", cap: "" },
  { action: "點擊序列按鈕", score: "+30", cap: "" },
  { action: "推薦好友成功", score: "+15", cap: "" },
  { action: "被推薦加入", score: "+10", cap: "" },
  { action: "90 天無互動", score: "-10", cap: "（每 90 天）" },
];

export function CustomerTypeToggle({
  userId,
  initialType,
  relationshipScore,
  relationshipLevel,
  totalEvents,
  tags,
}: {
  userId: string;
  initialType: string;
  relationshipScore: number;
  relationshipLevel: string;
  totalEvents: number;
  tags: string[];
}) {
  const router = useRouter();
  const [customerType, setCustomerType] = useState(initialType);
  const [loading, setLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const isReturning = customerType === "returning";

  async function toggleType() {
    const newType = isReturning ? "new" : "returning";
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/leads/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerType: newType }),
      });
      if (res.ok) {
        setCustomerType(newType);
        router.refresh();
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  // Check which auto-rules are triggered
  const triggeredRules = AUTO_RULES.filter((rule) =>
    rule.check(tags, relationshipScore, totalEvents)
  );
  const shouldUpgrade = !isReturning && triggeredRules.length > 0;

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4 mb-4">
      {/* Toggle header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-[var(--text-secondary)] mb-1">
            👤 客戶類型
          </p>
          <div className="flex items-center gap-3">
            <span
              className={`text-lg font-bold ${
                isReturning ? "text-[var(--brand-accent)]" : "text-emerald-500"
              }`}
            >
              {isReturning ? "🔄 熟客" : "🌱 新客"}
            </span>
            {shouldUpgrade && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 animate-pulse">
                ⚡ 建議升級為熟客
              </span>
            )}
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={toggleType}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50 ${
            isReturning
              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
              : "bg-[var(--brand-accent)]/15 text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/25 border border-[var(--brand-accent)]/30"
          }`}
        >
          {loading
            ? "切換中..."
            : isReturning
              ? "↩ 改為新客"
              : "↗ 升級為熟客"}
        </button>
      </div>

      {/* Auto-rule indicators */}
      {triggeredRules.length > 0 && (
        <div className="mb-3 space-y-1">
          {triggeredRules.map((rule, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-1.5"
            >
              <span>{rule.icon}</span>
              <span className="font-medium">{rule.label}</span>
              <span className="text-orange-400">— {rule.desc.split("→")[0]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Show rules toggle */}
      <button
        onClick={() => setShowRules(!showRules)}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-accent)] transition"
      >
        {showRules ? "▼ 收起判斷規則" : "▶ 查看自動判斷規則與計分方式"}
      </button>

      {/* Rules panel */}
      {showRules && (
        <div className="mt-3 space-y-4">
          {/* Auto upgrade rules */}
          <div>
            <p className="text-xs font-bold text-[var(--text-secondary)] mb-2">
              ⚡ 自動升級為熟客的條件（符合任一即觸發）
            </p>
            <div className="space-y-1.5">
              {AUTO_RULES.map((rule, i) => {
                const triggered = rule.check(tags, relationshipScore, totalEvents);
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                      triggered
                        ? "bg-emerald-50 border border-emerald-200"
                        : "bg-[var(--bg-tertiary)]"
                    }`}
                  >
                    <span className="shrink-0 mt-0.5">
                      {triggered ? "✅" : "⬜"}
                    </span>
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">
                        {rule.icon} {rule.label}
                      </span>
                      <p className="text-[var(--text-muted)]">{rule.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Score rules */}
          <div>
            <p className="text-xs font-bold text-[var(--text-secondary)] mb-2">
              📊 關係分計算方式（滿分 100）
            </p>
            <p className="text-xs text-[var(--text-muted)] mb-2">
              目前分數：<strong className="text-[var(--brand-accent)]">{relationshipScore}</strong> / 100
              ・等級：<strong className="text-[var(--text-primary)]">{relationshipLevel}</strong>
              ・等級門檻：新識(0-20) → 認識(21-40) → 熟識(41-60) → 信任(61-80) → 忠誠(81-100)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {SCORE_RULES.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs bg-[var(--bg-tertiary)] rounded px-3 py-1.5"
                >
                  <span className="text-[var(--text-primary)]">{rule.action}</span>
                  <span className={`font-mono font-bold ${
                    rule.score.startsWith("-") ? "text-red-500" : "text-emerald-500"
                  }`}>
                    {rule.score}
                    {rule.cap && <span className="text-[var(--text-muted)] font-normal">{rule.cap}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* How it works summary */}
          <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] rounded-lg p-3">
            <p className="font-bold text-[var(--text-secondary)] mb-1">💡 新客 vs 熟客的差異</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li><strong>新客</strong>：收到新客教育序列（Day0 歡迎 → Day3 品類介紹 → Day7 門市邀請 → Day30 追蹤）</li>
              <li><strong>熟客</strong>：收到熟客版圖文選單、會員優惠推播、維修序列</li>
              <li>系統會根據互動自動判斷，但你也可以手動切換</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
