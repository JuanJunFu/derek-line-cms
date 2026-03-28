"use client";

import { useState, useCallback } from "react";

interface Broadcast {
  id: string;
  name: string;
  messageType: string;
  content: any;
  audienceType: string;
  audienceFilter: any;
  audienceCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  status: string;
  sentCount: number;
  failCount: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]" },
  scheduled: { label: "已排程", color: "bg-blue-50 text-blue-600" },
  sending: { label: "發送中", color: "bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]" },
  sent: { label: "已發送", color: "bg-emerald-50 text-emerald-600" },
  failed: { label: "失敗", color: "bg-red-50 text-red-600" },
};

const MSG_TYPES = [
  { value: "text", label: "純文字" },
  { value: "image", label: "圖片" },
  { value: "flex", label: "Flex 模板" },
  { value: "json", label: "自訂 JSON" },
];

const PRESETS = [
  {
    id: "new-welcome",
    icon: "🌱",
    label: "新客歡迎",
    name: "新客歡迎推播",
    messageType: "text",
    textContent: "歡迎加入 DEREK 德瑞克衛浴！\n\n感謝您的關注，我們提供高品質的衛浴設備與專業服務。\n\n新朋友專屬好禮：\n首次諮詢即享免費丈量服務\n\n有任何問題，歡迎隨時傳訊息給我們！",
    audienceType: "tags",
    tagsInclude: "CustomerType:new",
  },
  {
    id: "vip-revisit",
    icon: "🔄",
    label: "熟客回訪",
    name: "熟客專屬優惠",
    messageType: "text",
    textContent: "親愛的老朋友，好久不見！\n\n感謝您一直以來的支持，特別為您準備了專屬回饋：\n\n會員獨享 — 指定商品 85 折\n再享免費安裝服務\n\n歡迎回來，讓我們繼續為您打造理想的衛浴空間！",
    audienceType: "tags",
    tagsInclude: "CustomerType:returning",
  },
  {
    id: "event-invite",
    icon: "🎪",
    label: "活動通知",
    name: "展覽/促銷活動邀請",
    messageType: "text",
    textContent: "DEREK 德瑞克衛浴邀請您！\n\n【活動名稱】\n日期：\n時間：\n地點：\n\n活動限定優惠：\n現場下單享額外折扣\n\n名額有限，歡迎提前預約！",
    audienceType: "all",
    tagsInclude: "",
  },
];

export function BroadcastClient({ initialBroadcasts }: { initialBroadcasts: Broadcast[] }) {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(initialBroadcasts);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [messageType, setMessageType] = useState("text");
  const [textContent, setTextContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [flexJson, setFlexJson] = useState("");
  const [audienceType, setAudienceType] = useState("all");
  const [tagsInclude, setTagsInclude] = useState("");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);

  const previewAudience = useCallback(async () => {
    const filter = audienceType === "tags" && tagsInclude.trim()
      ? { tags: tagsInclude.split(",").map((t) => t.trim()).filter(Boolean) }
      : undefined;
    try {
      const res = await fetch("/api/v1/broadcasts/audience-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audienceType, audienceFilter: filter }),
      });
      if (res.ok) {
        const data = await res.json();
        setAudienceCount(data.count);
      }
    } catch { /* ignore */ }
  }, [audienceType, tagsInclude]);

  function buildContent() {
    switch (messageType) {
      case "text": return { text: textContent };
      case "image": return { imageUrl };
      case "flex":
      case "json":
        try { return JSON.parse(flexJson); } catch { return null; }
      default: return { text: textContent };
    }
  }

  async function createBroadcast() {
    const content = buildContent();
    if (!name || !content) { setError("請填寫完整資料"); return; }

    setSaving(true);
    setError(null);
    const filter = audienceType === "tags" && tagsInclude.trim()
      ? { tags: tagsInclude.split(",").map((t) => t.trim()).filter(Boolean) }
      : undefined;

    try {
      const res = await fetch("/api/v1/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, messageType, content, audienceType, audienceFilter: filter }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "建立失敗"); return; }
      setBroadcasts([data.data, ...broadcasts]);
      resetForm();
      setSuccess("推播已建立（草稿）");
      setTimeout(() => setSuccess(null), 3000);
    } catch { setError("建立失敗"); }
    finally { setSaving(false); }
  }

  async function sendBroadcast(id: string) {
    if (!confirm("確定要立即發送此推播？")) return;
    setError(null);
    try {
      const res = await fetch(`/api/v1/broadcasts/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "發送失敗"); return; }
      setBroadcasts(broadcasts.map((b) =>
        b.id === id ? { ...b, status: "sent", sentCount: data.sentCount, failCount: data.failCount, sentAt: new Date().toISOString() } : b
      ));
      setSuccess(`發送完成：成功 ${data.sentCount}，失敗 ${data.failCount}`);
      setTimeout(() => setSuccess(null), 5000);
    } catch { setError("發送失敗"); }
  }

  async function deleteBroadcast(id: string) {
    if (!confirm("確定要刪除此推播？")) return;
    try {
      await fetch(`/api/v1/broadcasts/${id}`, { method: "DELETE" });
      setBroadcasts(broadcasts.filter((b) => b.id !== id));
    } catch { setError("刪除失敗"); }
  }

  function resetForm() {
    setShowNew(false);
    setName(""); setMessageType("text"); setTextContent(""); setImageUrl(""); setFlexJson("");
    setAudienceType("all"); setTagsInclude(""); setAudienceCount(null);
  }

  // Stats
  const sentCount = broadcasts.filter((b) => b.status === "sent").length;
  const draftCount = broadcasts.filter((b) => b.status === "draft").length;
  const totalSent = broadcasts.reduce((s, b) => s + b.sentCount, 0);

  return (
    <div>
      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">{error}</div>}
      {success && <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-600">{success}</div>}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[var(--text-primary)]">{broadcasts.length}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">推播總數</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{sentCount}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">已發送</p>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[var(--brand-accent)]">{totalSent.toLocaleString()}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">累計送達</p>
        </div>
      </div>

      {/* Presets */}
      {!showNew && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">快速建立</h3>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setShowNew(true);
                  setName(p.name);
                  setMessageType(p.messageType);
                  setTextContent(p.textContent);
                  setAudienceType(p.audienceType);
                  setTagsInclude(p.tagsInclude);
                }}
                className="flex items-center gap-1.5 text-sm border border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)] rounded-lg px-3 py-2 transition bg-[var(--card-bg)]"
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mb-6">
        {!showNew && (
          <button onClick={() => setShowNew(true)} className="text-sm bg-[var(--brand-primary)] hover:bg-[var(--text-secondary)] text-white rounded-lg px-4 py-2 transition">
            + 新增推播
          </button>
        )}
        <a href="/api/v1/broadcasts/export" className="text-sm border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg px-4 py-2 transition">
          匯出 CSV
        </a>
      </div>

      {/* New broadcast form */}
      {showNew && (
        <div className="mb-6 bg-[var(--bg-secondary)] border border-[var(--brand-accent)]/20 rounded-xl p-4">
          <h3 className="text-sm font-bold text-[var(--text-secondary)] mb-3">建立推播</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">推播名稱</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：週年慶通知、新品上架"
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]" />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">訊息類型</label>
              <div className="flex gap-2">
                {MSG_TYPES.map((t) => (
                  <button key={t.value} onClick={() => setMessageType(t.value)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition ${messageType === t.value ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]" : "border-[var(--border-strong)] text-[var(--text-muted)]"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {messageType === "text" && (
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">文字內容</label>
                <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} rows={4}
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)] resize-y" />
              </div>
            )}
            {messageType === "image" && (
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">圖片 URL</label>
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..."
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]" />
              </div>
            )}
            {(messageType === "flex" || messageType === "json") && (
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">{messageType === "flex" ? "Flex Message JSON" : "自訂 LINE Message JSON"}</label>
                <textarea value={flexJson} onChange={(e) => setFlexJson(e.target.value)} rows={6} placeholder='{"type": "bubble", ...}'
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)] resize-y" />
              </div>
            )}

            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1">受眾</label>
              <div className="flex gap-2 mb-2">
                <button onClick={() => { setAudienceType("all"); setAudienceCount(null); }}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${audienceType === "all" ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]" : "border-[var(--border-strong)] text-[var(--text-muted)]"}`}>
                  全部好友
                </button>
                <button onClick={() => setAudienceType("tags")}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${audienceType === "tags" ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]" : "border-[var(--border-strong)] text-[var(--text-muted)]"}`}>
                  依標籤篩選
                </button>
              </div>
              {audienceType === "tags" && (
                <input value={tagsInclude} onChange={(e) => setTagsInclude(e.target.value)}
                  placeholder="輸入標籤，用逗號分隔（例：Intent:Comfort_High, Region:taipei）"
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)] mb-2" />
              )}
              <button onClick={previewAudience} className="text-xs text-[var(--brand-accent)] hover:underline">
                預估受眾人數
              </button>
              {audienceCount !== null && (
                <span className="text-xs text-[var(--text-secondary)] ml-2">預估：{audienceCount.toLocaleString()} 人</span>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={createBroadcast} disabled={saving || !name}
                className="bg-[var(--brand-primary)] hover:bg-[var(--text-secondary)] text-white rounded-lg px-4 py-2 text-sm transition disabled:opacity-50">
                {saving ? "建立中..." : "建立推播（草稿）"}
              </button>
              <button onClick={resetForm} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-sm transition px-4 py-2">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast list */}
      {broadcasts.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-8">尚無推播紀錄</p>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => {
            const st = STATUS_LABELS[b.status] || STATUS_LABELS.draft;
            const canSend = b.status === "draft" || b.status === "scheduled";
            const canDelete = b.status === "draft" || b.status === "scheduled";
            return (
              <div key={b.id} className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{b.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${st.color}`}>{st.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">{b.messageType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {canSend && (
                      <button onClick={() => sendBroadcast(b.id)}
                        className="text-xs bg-[var(--brand-primary)] hover:bg-[var(--text-secondary)] text-white rounded px-3 py-1 transition">
                        發送
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => deleteBroadcast(b.id)} className="text-xs text-red-600 hover:text-red-700 transition">刪除</button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span>受眾：{b.audienceType === "all" ? "全部好友" : "標籤篩選"} ({b.audienceCount}人)</span>
                  {b.status === "sent" && <span className="text-emerald-600">送達 {b.sentCount}</span>}
                  {b.failCount > 0 && <span className="text-red-600">失敗 {b.failCount}</span>}
                  <span>{b.sentAt ? `發送於 ${new Date(b.sentAt).toLocaleString("zh-TW")}` : `建立於 ${new Date(b.createdAt).toLocaleString("zh-TW")}`}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
