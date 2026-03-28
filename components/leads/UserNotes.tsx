"use client";

import { useEffect, useState } from "react";

interface Note {
  id: string;
  userId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export function UserNotes({ userId }: { userId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchNotes() {
    try {
      const res = await fetch(`/api/v1/notes/${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes as Note[]);
      }
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotes();
  }, [userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/notes/${encodeURIComponent(userId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        setContent("");
        // Refresh notes
        setLoading(true);
        await fetchNotes();
      }
    } catch (err) {
      console.error("Failed to create note:", err);
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-[var(--text-muted)] text-sm">
        載入中...
      </div>
    );
  }

  return (
    <div>
      {/* Notes list */}
      <div className="space-y-3 mb-6">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">
            尚無備註
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {note.authorName}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {formatTime(note.createdAt)}
                </span>
              </div>
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                {note.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Add note form */}
      <form
        onSubmit={handleSubmit}
        className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg p-3"
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="新增備註..."
          rows={3}
          className="w-full bg-[var(--bg-primary)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-[var(--brand-primary)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
          >
            {submitting ? "儲存中..." : "新增備註"}
          </button>
        </div>
      </form>
    </div>
  );
}
