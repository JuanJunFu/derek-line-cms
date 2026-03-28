"use client";

import { useCallback, useState } from "react";

interface TagInfo {
  tag: string;
  count: number;
  group: string;
  label?: string | null;
}

const GROUP_LABELS: Record<string, string> = {
  Intent: "購買意圖",
  Region: "地區",
  Status: "狀態",
  Role: "角色",
  Custom: "自訂標籤",
};

const GROUP_ORDER = ["Intent", "Region", "Status", "Role", "Custom"];

export function TagsClient({ initialTags }: { initialTags: TagInfo[] }) {
  const [tags, setTags] = useState<TagInfo[]>(initialTags);
  const [search, setSearch] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagGroup, setNewTagGroup] = useState("Custom");
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const refreshTags = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  // Filter tags
  const filteredTags = tags.filter((t) =>
    t.tag.toLowerCase().includes(search.toLowerCase())
  );

  // Group tags
  const grouped = new Map<string, TagInfo[]>();
  for (const tag of filteredTags) {
    const group = tag.group;
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(tag);
  }

  // Sort groups
  const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a[0]);
    const bi = GROUP_ORDER.indexOf(b[0]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const totalTagTypes = tags.length;
  const totalTagged = tags.reduce((acc, t) => acc + t.count, 0);

  // Add tag — POST to API, persist to DB
  const handleAddTag = useCallback(async () => {
    if (!newTagName.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/v1/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), group: newTagGroup }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "新增失敗");
        setAdding(false);
        return;
      }
      setNewTagName("");
      setShowAddForm(false);
      await refreshTags();
    } catch {
      setError("網路錯誤，請重試");
    }
    setAdding(false);
  }, [newTagName, newTagGroup, refreshTags]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            標籤管理
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            管理用戶標籤系統，共 {totalTagTypes} 種標籤，
            {totalTagged.toLocaleString()} 次標記
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-sm bg-[var(--brand-primary)] text-white rounded-lg px-4 py-2 hover:opacity-90 transition"
          >
            新增標籤
          </button>
        )}
      </div>

      {/* Add Tag Form */}
      {showAddForm && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-xl p-4 mb-6">
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">
            新增標籤
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {/* Group selector */}
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                標籤群組
              </label>
              <select
                value={newTagGroup}
                onChange={(e) => setNewTagGroup(e.target.value)}
                className="border border-[var(--border-strong)] rounded-lg px-3 py-1.5 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
              >
                {GROUP_ORDER.map((g) => (
                  <option key={g} value={g}>
                    {GROUP_LABELS[g]}
                  </option>
                ))}
              </select>
            </div>
            {/* Tag name */}
            <div className="flex-1">
              <label className="block text-xs text-[var(--text-muted)] mb-1">
                標籤名稱
              </label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-[var(--text-muted)] shrink-0 font-mono">
                  {newTagGroup}:
                </span>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => {
                    setNewTagName(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTag();
                  }}
                  placeholder="輸入標籤名稱（例: Premium_Bath）"
                  className="flex-1 border border-[var(--border-strong)] rounded-lg px-3 py-1.5 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
                />
              </div>
            </div>
            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleAddTag}
                disabled={adding || !newTagName.trim()}
                className="text-sm px-4 py-1.5 rounded-lg bg-[var(--brand-primary)] text-white hover:opacity-90 transition disabled:opacity-50"
              >
                {adding ? "新增中..." : "新增"}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewTagName("");
                  setError("");
                }}
                className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
              >
                取消
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-500 mt-2">{error}</p>
          )}
          <p className="text-xs text-[var(--text-muted)] mt-2">
            提示：標籤新增後，可在客戶矩陣中為用戶指派此標籤
          </p>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋標籤..."
          className="w-full max-w-sm border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
        />
      </div>

      {/* Tag Groups */}
      {sortedGroups.length === 0 ? (
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-8 text-center">
          <p className="text-[var(--text-muted)]">
            {search ? "無符合搜尋的標籤" : "尚無任何標籤，點擊「新增標籤」開始建立"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map(([group, groupTags]) => (
            <div
              key={group}
              className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  {GROUP_LABELS[group] || group}
                </h2>
                <span className="text-xs text-[var(--text-muted)]">
                  {groupTags.length} 個標籤
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {groupTags.map((t) => (
                  <div
                    key={t.tag}
                    className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]"
                  >
                    <span className="text-[var(--text-primary)]">
                      {t.tag.includes(":") ? t.tag.split(":")[1] : t.tag}
                    </span>
                    <span className="text-[var(--brand-accent)] font-medium">
                      {t.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
