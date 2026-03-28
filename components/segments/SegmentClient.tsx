"use client";

import { useCallback, useEffect, useState } from "react";

interface Segment {
  id: string;
  name: string;
  description: string | null;
  conditions: SegmentConditions;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SegmentConditions {
  tagsInclude?: string[];
  tagsExclude?: string[];
  leadScore?: string[];
  regions?: string[];
  customerType?: string[];
}

interface TagInfo {
  tag: string;
  count: number;
  group: string;
}

const LEAD_SCORES = ["HOT", "WARM", "COLD"];
const CUSTOMER_TYPES = ["new", "returning"];
const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  new: "新客",
  returning: "回購客",
};

export function SegmentClient({
  initialSegments,
}: {
  initialSegments: Segment[];
}) {
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<TagInfo[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInclude, setTagsInclude] = useState<string[]>([]);
  const [tagsExclude, setTagsExclude] = useState<string[]>([]);
  const [leadScore, setLeadScore] = useState<string[]>([]);
  const [customerType, setCustomerType] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [tagSearchExclude, setTagSearchExclude] = useState("");

  // Preview
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch tags for selectors
  useEffect(() => {
    fetch("/api/v1/tags")
      .then((r) => r.json())
      .then((d) => setAllTags(d.tags ?? []))
      .catch(() => {});
  }, []);

  const buildConditions = useCallback((): SegmentConditions => {
    const c: SegmentConditions = {};
    if (tagsInclude.length > 0) c.tagsInclude = tagsInclude;
    if (tagsExclude.length > 0) c.tagsExclude = tagsExclude;
    if (leadScore.length > 0) c.leadScore = leadScore;
    if (customerType.length > 0) c.customerType = customerType;
    return c;
  }, [tagsInclude, tagsExclude, leadScore, customerType]);

  // Preview audience count
  const handlePreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/v1/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "preview",
          conditions: buildConditions(),
          preview: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewCount(data.userCount);
      }
    } catch {
      // ignore
    } finally {
      setPreviewLoading(false);
    }
  }, [name, buildConditions]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setTagsInclude([]);
    setTagsExclude([]);
    setLeadScore([]);
    setCustomerType([]);
    setPreviewCount(null);
    setEditingId(null);
    setShowForm(false);
    setTagSearch("");
    setTagSearchExclude("");
  };

  const handleEdit = (seg: Segment) => {
    setEditingId(seg.id);
    setName(seg.name);
    setDescription(seg.description || "");
    setTagsInclude(seg.conditions.tagsInclude || []);
    setTagsExclude(seg.conditions.tagsExclude || []);
    setLeadScore(seg.conditions.leadScore || []);
    setCustomerType(seg.conditions.customerType || []);
    setPreviewCount(seg.userCount);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const conditions = buildConditions();
      if (editingId) {
        const res = await fetch(`/api/v1/segments/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, conditions }),
        });
        if (res.ok) {
          const { segment } = await res.json();
          setSegments((prev) =>
            prev.map((s) => (s.id === editingId ? segment : s))
          );
          resetForm();
        }
      } else {
        const res = await fetch("/api/v1/segments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, conditions }),
        });
        if (res.ok) {
          const { segment } = await res.json();
          setSegments((prev) => [segment, ...prev]);
          resetForm();
        }
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此分群？")) return;
    try {
      const res = await fetch(`/api/v1/segments/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSegments((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      // ignore
    }
  };

  const toggleArrayItem = (
    arr: string[],
    setter: (v: string[]) => void,
    item: string
  ) => {
    if (arr.includes(item)) {
      setter(arr.filter((x) => x !== item));
    } else {
      setter([...arr, item]);
    }
  };

  const filteredTags = allTags.filter(
    (t) =>
      t.tag.toLowerCase().includes(tagSearch.toLowerCase()) &&
      !tagsInclude.includes(t.tag)
  );
  const filteredTagsExclude = allTags.filter(
    (t) =>
      t.tag.toLowerCase().includes(tagSearchExclude.toLowerCase()) &&
      !tagsExclude.includes(t.tag)
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            👥 受眾分群
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            建立與管理受眾分群，精準推播行銷訊息
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm bg-[var(--brand-primary)] text-white rounded-lg px-4 py-2 hover:opacity-90 transition"
          >
            新增分群
          </button>
        )}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-xl p-5 mb-6">
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">
            {editingId ? "編輯分群" : "新增分群"}
          </h2>

          {/* Name & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">
                分群名稱 *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：高意願北部客戶"
                className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] block mb-1">
                描述
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="此分群的用途說明"
                className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
              />
            </div>
          </div>

          {/* Lead Score */}
          <div className="mb-4">
            <label className="text-xs text-[var(--text-muted)] block mb-2">
              購買意圖等級
            </label>
            <div className="flex flex-wrap gap-2">
              {LEAD_SCORES.map((score) => (
                <button
                  key={score}
                  onClick={() => toggleArrayItem(leadScore, setLeadScore, score)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                    leadScore.includes(score)
                      ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                      : "border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--brand-accent)]"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Type */}
          <div className="mb-4">
            <label className="text-xs text-[var(--text-muted)] block mb-2">
              客戶類型
            </label>
            <div className="flex flex-wrap gap-2">
              {CUSTOMER_TYPES.map((ct) => (
                <button
                  key={ct}
                  onClick={() =>
                    toggleArrayItem(customerType, setCustomerType, ct)
                  }
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                    customerType.includes(ct)
                      ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                      : "border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--brand-accent)]"
                  }`}
                >
                  {CUSTOMER_TYPE_LABELS[ct] || ct}
                </button>
              ))}
            </div>
          </div>

          {/* Tags Include */}
          <div className="mb-4">
            <label className="text-xs text-[var(--text-muted)] block mb-2">
              包含標籤（需全部符合）
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tagsInclude.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[var(--brand-accent)]/15 text-[var(--brand-accent)]"
                >
                  {tag}
                  <button
                    onClick={() =>
                      setTagsInclude(tagsInclude.filter((t) => t !== tag))
                    }
                    className="hover:text-[var(--status-hot)] ml-0.5"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="搜尋標籤..."
              className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-1.5 text-xs bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)] mb-1"
            />
            {tagSearch && (
              <div className="max-h-32 overflow-y-auto border border-[var(--border-strong)] rounded-lg bg-[var(--bg-primary)]">
                {filteredTags.slice(0, 20).map((t) => (
                  <button
                    key={t.tag}
                    onClick={() => {
                      setTagsInclude([...tagsInclude, t.tag]);
                      setTagSearch("");
                    }}
                    className="block w-full text-left text-xs px-3 py-1.5 hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                  >
                    {t.tag}{" "}
                    <span className="text-[var(--text-muted)]">({t.count})</span>
                  </button>
                ))}
                {filteredTags.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] px-3 py-2">
                    無符合標籤
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tags Exclude */}
          <div className="mb-4">
            <label className="text-xs text-[var(--text-muted)] block mb-2">
              排除標籤（含任一即排除）
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tagsExclude.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600"
                >
                  {tag}
                  <button
                    onClick={() =>
                      setTagsExclude(tagsExclude.filter((t) => t !== tag))
                    }
                    className="hover:text-red-800 ml-0.5"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagSearchExclude}
              onChange={(e) => setTagSearchExclude(e.target.value)}
              placeholder="搜尋要排除的標籤..."
              className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-1.5 text-xs bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)] mb-1"
            />
            {tagSearchExclude && (
              <div className="max-h-32 overflow-y-auto border border-[var(--border-strong)] rounded-lg bg-[var(--bg-primary)]">
                {filteredTagsExclude.slice(0, 20).map((t) => (
                  <button
                    key={t.tag}
                    onClick={() => {
                      setTagsExclude([...tagsExclude, t.tag]);
                      setTagSearchExclude("");
                    }}
                    className="block w-full text-left text-xs px-3 py-1.5 hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                  >
                    {t.tag}{" "}
                    <span className="text-[var(--text-muted)]">({t.count})</span>
                  </button>
                ))}
                {filteredTagsExclude.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] px-3 py-2">
                    無符合標籤
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Preview & Actions */}
          <div className="flex items-center justify-between border-t border-[var(--border-strong)] pt-4 mt-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePreview}
                disabled={previewLoading}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--brand-accent)] text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/10 transition disabled:opacity-50"
              >
                {previewLoading ? "計算中..." : "預覽受眾人數"}
              </button>
              {previewCount !== null && (
                <span className="text-sm font-bold text-[var(--brand-accent)]">
                  {previewCount.toLocaleString()} 人
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetForm}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="text-xs px-4 py-1.5 rounded-lg bg-[var(--brand-primary)] text-white hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? "儲存中..." : editingId ? "更新分群" : "建立分群"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Segment List */}
      {segments.length === 0 ? (
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-8 text-center">
          <p className="text-[var(--text-muted)]">尚未建立任何分群</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            點擊「新增分群」開始建立受眾分群
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {segments.map((seg) => (
            <div
              key={seg.id}
              className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {seg.name}
                    </h3>
                    <span className="text-xs font-medium text-[var(--brand-accent)]">
                      {seg.userCount.toLocaleString()} 人
                    </span>
                  </div>
                  {seg.description && (
                    <p className="text-xs text-[var(--text-muted)] mb-2">
                      {seg.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {seg.conditions.leadScore?.map((s) => (
                      <span
                        key={s}
                        className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                      >
                        {s}
                      </span>
                    ))}
                    {seg.conditions.customerType?.map((ct) => (
                      <span
                        key={ct}
                        className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                      >
                        {CUSTOMER_TYPE_LABELS[ct] || ct}
                      </span>
                    ))}
                    {seg.conditions.tagsInclude?.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-1.5 py-0.5 rounded bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]"
                      >
                        {t}
                      </span>
                    ))}
                    {seg.conditions.tagsExclude?.map((t) => (
                      <span
                        key={t}
                        className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-500 line-through"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(seg.createdAt).toLocaleDateString("zh-TW")}
                  </span>
                  <button
                    onClick={() => handleEdit(seg)}
                    className="text-xs px-2 py-1 rounded border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(seg.id)}
                    className="text-xs px-2 py-1 rounded border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-red-500 transition"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
