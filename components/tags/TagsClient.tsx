"use client";

import { useCallback, useEffect, useState } from "react";

interface TagInfo {
  tag: string;
  count: number;
  group: string;
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
  const [newTag, setNewTag] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);

  // Refresh tags
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

  useEffect(() => {
    // Initial tags are passed from server, no need to fetch again
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

  // Add a custom tag — this creates a placeholder. In a real scenario,
  // you'd batch-add the tag to selected users via /api/v1/tags/batch.
  // Here we just show it in the UI for immediate feedback.
  const handleAddCustomTag = useCallback(async () => {
    if (!newTag.trim()) return;
    setAdding(true);
    const tagName = newTag.startsWith("Custom:")
      ? newTag
      : `Custom:${newTag.trim()}`;
    // Add to local state immediately
    setTags((prev) => {
      const existing = prev.find((t) => t.tag === tagName);
      if (existing) return prev;
      return [...prev, { tag: tagName, count: 0, group: "Custom" }];
    });
    setNewTag("");
    setShowAddForm(false);
    setAdding(false);
    await refreshTags();
  }, [newTag, refreshTags]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            標籤管理
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            管理用戶標籤系統，共 {totalTagTypes} 種標籤，
            {totalTagged.toLocaleString()} 次標記
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-sm bg-[var(--brand-primary)] text-white rounded-lg px-4 py-2 hover:opacity-90 transition"
          >
            新增自訂標籤
          </button>
        )}
      </div>

      {/* Add Custom Tag Form */}
      {showAddForm && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-xl p-4 mb-6">
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">
            新增自訂標籤
          </h2>
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs text-[var(--text-muted)] shrink-0">
                  Custom:
                </span>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCustomTag();
                  }}
                  placeholder="輸入標籤名稱"
                  className="flex-1 border border-[var(--border-strong)] rounded-lg px-3 py-1.5 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
                />
              </div>
            </div>
            <button
              onClick={handleAddCustomTag}
              disabled={adding || !newTag.trim()}
              className="text-xs px-4 py-1.5 rounded-lg bg-[var(--brand-primary)] text-white hover:opacity-90 transition disabled:opacity-50"
            >
              新增
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewTag("");
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
            >
              取消
            </button>
          </div>
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
            {search ? "無符合搜尋的標籤" : "尚無任何標籤"}
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
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]"
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
