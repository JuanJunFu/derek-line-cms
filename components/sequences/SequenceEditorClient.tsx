"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface SequenceStep {
  id?: string;
  dayOffset: number;
  messageType: string;
  content: any;
  order: number;
}

interface Sequence {
  id: string;
  name: string;
  trigger: string;
  isActive: boolean;
  steps: SequenceStep[];
  createdAt: string;
  updatedAt: string;
}

// Categories for filtering
const CATEGORY_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  new_customer: { label: "新人", emoji: "🌱", color: "bg-green-900/30 text-green-400 border-green-700" },
  repair_inquiry: { label: "熟客", emoji: "🔄", color: "bg-blue-900/30 text-blue-400 border-blue-700" },
  product_view_smart: { label: "活動", emoji: "🎯", color: "bg-amber-900/30 text-amber-400 border-amber-700" },
  event_promo: { label: "活動", emoji: "🎪", color: "bg-purple-900/30 text-purple-400 border-purple-700" },
  manual: { label: "手動", emoji: "✋", color: "bg-gray-800 text-gray-400 border-gray-700" },
};

const TRIGGER_OPTIONS = [
  { value: "new_customer", label: "🌱 新人 — 加入好友時觸發" },
  { value: "repair_inquiry", label: "🔄 熟客 — 維修詢問觸發" },
  { value: "product_view_smart", label: "🎯 活動 — 瀏覽智慧馬桶觸發" },
  { value: "event_promo", label: "🎪 活動 — 促銷/季節推播" },
  { value: "manual", label: "✋ 手動 — 手動觸發" },
];

const MESSAGE_TYPE_OPTIONS = [
  { value: "flex", label: "Flex Message" },
  { value: "text", label: "純文字" },
];

const TEMPLATE_OPTIONS = [
  { value: "welcome", label: "歡迎訊息" },
  { value: "category_education", label: "品類教育" },
  { value: "day7_personalized", label: "個人化推薦" },
  { value: "follow_up", label: "追蹤訊息" },
  { value: "repair_immediate", label: "維修即時回覆" },
  { value: "repair_upgrade", label: "升級推薦" },
  { value: "custom", label: "自訂內容" },
];

export function SequenceEditorClient() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Editing state
  const [editName, setEditName] = useState("");
  const [editTrigger, setEditTrigger] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editSteps, setEditSteps] = useState<SequenceStep[]>([]);

  // New sequence form
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState("new_customer");

  const fetchSequences = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/sequence-defs");
      const data = await res.json();
      if (res.ok) setSequences(data.data);
    } catch {
      setError("載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  function startEdit(seq: Sequence) {
    setEditingId(seq.id);
    setEditName(seq.name);
    setEditTrigger(seq.trigger);
    setEditActive(seq.isActive);
    setEditSteps(seq.steps.map((s) => ({ ...s })));
    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditSteps([]);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/sequence-defs/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          trigger: editTrigger,
          isActive: editActive,
          steps: editSteps.map((s, i) => ({
            dayOffset: s.dayOffset,
            messageType: s.messageType,
            content: s.content,
            order: i,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "儲存失敗");
        return;
      }
      setSuccess("儲存成功！");
      setEditingId(null);
      fetchSequences();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function createSequence() {
    if (!newName || !newTrigger) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/sequence-defs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          trigger: newTrigger,
          steps: [
            {
              dayOffset: 0,
              messageType: "text",
              content: { label: "第一則訊息", text: "Hello!", template: "custom" },
              order: 0,
            },
          ],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "建立失敗");
        return;
      }
      setSuccess("序列已建立！");
      setShowNew(false);
      setNewName("");
      setNewTrigger("new_customer");
      fetchSequences();
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("建立失敗");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(seq: Sequence) {
    try {
      await fetch(`/api/v1/sequence-defs/${seq.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !seq.isActive }),
      });
      fetchSequences();
    } catch {
      setError("切換失敗");
    }
  }

  function addStep() {
    const maxDay = editSteps.length > 0 ? Math.max(...editSteps.map((s) => s.dayOffset)) : 0;
    setEditSteps([
      ...editSteps,
      {
        dayOffset: maxDay + 3,
        messageType: "flex",
        content: { label: "新步驟", template: "custom" },
        order: editSteps.length,
      },
    ]);
  }

  function removeStep(index: number) {
    setEditSteps(editSteps.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: string, value: any) {
    setEditSteps(editSteps.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function updateStepContent(index: number, key: string, value: string) {
    setEditSteps(
      editSteps.map((s, i) =>
        i === index ? { ...s, content: { ...(s.content || {}), [key]: value } } : s
      )
    );
  }

  // Filter sequences by category
  const filteredSequences = filterCategory
    ? sequences.filter((s) => s.trigger === filterCategory)
    : sequences;

  // Category counts
  const categoryCounts: Record<string, number> = {};
  for (const seq of sequences) {
    const cat = seq.trigger;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-100">📝 序列定義編輯器</h1>
        <Link
          href="/sequences"
          className="text-xs text-amber-500 hover:text-amber-400 transition"
        >
          ← 返回排程訊息
        </Link>
      </div>
      <p className="text-xs text-gray-500 mb-6">
        設定自動發送序列 · 勾選開關控制是否發送 · 設定時間點後自動推播
      </p>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-900/30 border border-green-700 rounded-lg px-3 py-2 text-sm text-green-300">
          {success}
        </div>
      )}

      {/* ── Category filter tabs ── */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <span className="text-xs text-gray-600">分類：</span>
        <button
          onClick={() => setFilterCategory(null)}
          className={`text-xs px-3 py-1 rounded-lg border transition ${
            !filterCategory
              ? "bg-gray-800 border-gray-600 text-gray-200"
              : "border-gray-800 text-gray-500 hover:text-gray-300"
          }`}
        >
          全部 ({sequences.length})
        </button>
        {Object.entries(CATEGORY_MAP).map(([key, meta]) => {
          const count = categoryCounts[key] || 0;
          if (count === 0 && key !== "new_customer" && key !== "repair_inquiry" && key !== "event_promo")
            return null;
          return (
            <button
              key={key}
              onClick={() => setFilterCategory(filterCategory === key ? null : key)}
              className={`text-xs px-3 py-1 rounded-lg border transition ${
                filterCategory === key
                  ? meta.color
                  : "border-gray-800 text-gray-500 hover:text-gray-300"
              }`}
            >
              {meta.emoji} {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-200">{sequences.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">序列總數</p>
        </div>
        <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-400">
            {sequences.filter((s) => s.isActive).length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">已啟用</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-500">
            {sequences.filter((s) => !s.isActive).length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">已停用</p>
        </div>
      </div>

      {/* New sequence button */}
      {!showNew && (
        <button
          onClick={() => setShowNew(true)}
          className="mb-6 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-4 py-2 transition"
        >
          + 新增序列
        </button>
      )}

      {/* New sequence form */}
      {showNew && (
        <div className="mb-6 bg-gray-900 border border-amber-800/50 rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3">新增序列</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">序列名稱</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例：新人歡迎序列、週年慶活動推播"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">分類 / 觸發條件</label>
              <div className="grid grid-cols-2 gap-2">
                {TRIGGER_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setNewTrigger(t.value)}
                    className={`text-left text-xs px-3 py-2 rounded-lg border transition ${
                      newTrigger === t.value
                        ? "border-amber-600 bg-amber-900/30 text-amber-400"
                        : "border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createSequence}
                disabled={saving || !newName}
                className="bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-4 py-2 text-sm transition disabled:opacity-50"
              >
                建立序列
              </button>
              <button
                onClick={() => setShowNew(false)}
                className="text-gray-500 hover:text-gray-300 text-sm transition px-4 py-2"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sequence list */}
      {filteredSequences.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          {filterCategory ? "此分類下無序列" : "尚無序列定義。點擊「+ 新增序列」開始建立。"}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredSequences.map((seq) => {
            const isEditing = editingId === seq.id;
            const catMeta = CATEGORY_MAP[seq.trigger] || CATEGORY_MAP.manual;

            return (
              <div
                key={seq.id}
                className={`bg-gray-900 border rounded-xl overflow-hidden transition ${
                  isEditing
                    ? "border-amber-600"
                    : seq.isActive
                      ? "border-gray-800"
                      : "border-gray-800 opacity-60"
                }`}
              >
                {/* Header with toggle */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    {/* ON/OFF Toggle — prominent checkbox style */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={seq.isActive}
                        onChange={() => toggleActive(seq)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 rounded-full bg-gray-700 peer-checked:bg-green-600 transition-colors relative">
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            seq.isActive ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </div>
                      <span className={`text-xs ${seq.isActive ? "text-green-400" : "text-gray-500"}`}>
                        {seq.isActive ? "發送中" : "已停用"}
                      </span>
                    </label>

                    {/* Name */}
                    {isEditing ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-amber-500"
                      />
                    ) : (
                      <span className="text-sm font-bold text-gray-200">{seq.name}</span>
                    )}

                    {/* Category badge */}
                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${catMeta.color}`}
                    >
                      {catMeta.emoji} {catMeta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">
                      {seq.steps.length} 步驟
                    </span>
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="text-xs bg-amber-600 hover:bg-amber-500 text-white rounded px-3 py-1 transition disabled:opacity-50"
                        >
                          {saving ? "儲存中…" : "💾 儲存"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs text-gray-500 hover:text-gray-300 transition"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(seq)}
                        className="text-xs text-amber-400 hover:text-amber-300 transition"
                      >
                        ✏️ 編輯
                      </button>
                    )}
                  </div>
                </div>

                {/* Steps */}
                <div className="px-4 py-3">
                  {isEditing ? (
                    <>
                      {/* Trigger selector */}
                      <div className="mb-4">
                        <label className="block text-xs text-gray-500 mb-1">分類 / 觸發條件</label>
                        <select
                          value={editTrigger}
                          onChange={(e) => setEditTrigger(e.target.value)}
                          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
                        >
                          {TRIGGER_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Steps editor */}
                      <p className="text-xs text-gray-500 mb-2">
                        步驟排程 — 設定觸發後第幾天發送
                      </p>
                      <div className="space-y-3">
                        {editSteps.map((step, idx) => (
                          <div
                            key={idx}
                            className="bg-gray-800/50 border border-gray-700 rounded-lg p-3"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xs text-amber-400 font-bold w-14 shrink-0">
                                步驟 {idx + 1}
                              </span>

                              {/* Day offset — prominent */}
                              <div className="flex items-center gap-1 bg-gray-900 rounded px-2 py-1 border border-gray-700">
                                <span className="text-xs text-gray-400">觸發後第</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={step.dayOffset}
                                  onChange={(e) =>
                                    updateStep(idx, "dayOffset", parseInt(e.target.value) || 0)
                                  }
                                  className="w-12 bg-transparent text-center text-sm text-amber-400 font-bold focus:outline-none"
                                />
                                <span className="text-xs text-gray-400">天發送</span>
                              </div>

                              <select
                                value={step.messageType}
                                onChange={(e) => updateStep(idx, "messageType", e.target.value)}
                                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
                              >
                                {MESSAGE_TYPE_OPTIONS.map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>

                              <div className="flex-1" />
                              <button
                                onClick={() => removeStep(idx)}
                                className="text-xs text-red-400 hover:text-red-300 transition"
                              >
                                🗑
                              </button>
                            </div>

                            {/* Content fields */}
                            <div className="space-y-2 pl-14">
                              <div>
                                <label className="block text-xs text-gray-500 mb-0.5">標題</label>
                                <input
                                  value={step.content?.label || ""}
                                  onChange={(e) =>
                                    updateStepContent(idx, "label", e.target.value)
                                  }
                                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
                                  placeholder="步驟標題"
                                />
                              </div>
                              {step.messageType === "text" ? (
                                <div>
                                  <label className="block text-xs text-gray-500 mb-0.5">
                                    文字內容
                                  </label>
                                  <textarea
                                    value={step.content?.text || ""}
                                    onChange={(e) =>
                                      updateStepContent(idx, "text", e.target.value)
                                    }
                                    rows={3}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-amber-500 resize-y"
                                    placeholder="輸入要傳送的文字"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <label className="block text-xs text-gray-500 mb-0.5">
                                    Flex 模板
                                  </label>
                                  <select
                                    value={step.content?.template || "custom"}
                                    onChange={(e) =>
                                      updateStepContent(idx, "template", e.target.value)
                                    }
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
                                  >
                                    {TEMPLATE_OPTIONS.map((t) => (
                                      <option key={t.value} value={t.value}>
                                        {t.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={addStep}
                        className="mt-3 text-xs text-amber-400 hover:text-amber-300 border border-dashed border-amber-800 rounded-lg px-3 py-1.5 transition hover:border-amber-600"
                      >
                        + 新增步驟
                      </button>
                    </>
                  ) : (
                    /* Read-only timeline */
                    <div className="relative pl-6">
                      {/* Timeline line */}
                      <div className="absolute left-2 top-1 bottom-1 w-px bg-gray-700" />

                      <div className="space-y-3">
                        {seq.steps.map((step, idx) => (
                          <div key={step.id || idx} className="relative flex items-start gap-3">
                            {/* Dot */}
                            <div
                              className={`absolute -left-4 top-1 w-3 h-3 rounded-full z-10 ${
                                step.messageType === "flex"
                                  ? "bg-amber-500"
                                  : "bg-blue-500"
                              }`}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-amber-400">
                                  Day {step.dayOffset}
                                </span>
                                <span className="text-xs text-gray-600">
                                  {step.messageType === "flex" ? "Flex" : "文字"}
                                </span>
                              </div>
                              <p className="text-sm text-gray-300">
                                {(step.content as any)?.label || `步驟 ${idx + 1}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
