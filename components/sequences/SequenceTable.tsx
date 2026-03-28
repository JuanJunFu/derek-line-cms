"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ScheduledMessage = {
  id: string;
  userId: string;
  sequenceId: string;
  stepId: string;
  scheduledAt: string;
  sentAt: string | null;
  status: string;
  createdAt: string;
};

const STEP_LABELS: Record<string, string> = {
  step_day0:   "Day 0 歡迎",
  step_day3:   "Day 3 品類教育",
  step_day7:   "Day 7 個人化推薦",
  step_day30:  "Day 30 追蹤",
  repair_day0: "維修 即時回覆",
  repair_day3: "維修 Day 3 升級推薦",
};

const SEQ_LABELS: Record<string, string> = {
  hardcode_new_customer: "新客教育序列",
  hardcode_repair:       "維修服務序列",
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:    { bg: "bg-[var(--brand-accent)]/10", text: "text-[var(--brand-accent)]", label: "⏳ 待發送" },
  processing: { bg: "bg-blue-50",  text: "text-blue-600",  label: "⚙️ 處理中" },
  sent:       { bg: "bg-emerald-50", text: "text-emerald-600", label: "✅ 已發送" },
  cancelled:  { bg: "bg-[var(--bg-tertiary)]",     text: "text-[var(--text-muted)]",  label: "✖ 已取消" },
};

export function SequenceTable({ messages }: { messages: ScheduledMessage[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCancel(id: string) {
    setActionId(id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/sequences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      startTransition(() => router.refresh());
    } catch {
      setError("操作失敗，請重試");
    } finally {
      setActionId(null);
    }
  }

  async function handleReschedule(id: string) {
    if (!rescheduleDate) { setError("請選擇新的發送時間"); return; }
    setActionId(id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/sequences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", scheduledAt: rescheduleDate }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setRescheduleId(null);
      setRescheduleDate("");
      startTransition(() => router.refresh());
    } catch {
      setError("操作失敗，請重試");
    } finally {
      setActionId(null);
    }
  }

  if (messages.length === 0) {
    return <p className="text-sm text-[var(--text-muted)] py-4 text-center">無排程訊息</p>;
  }

  return (
    <div>
      {error && (
        <div className="mb-3 bg-red-50 border border-red-300 rounded-lg px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="space-y-2">
        {messages.map((msg) => {
          const st = STATUS_STYLES[msg.status] ?? STATUS_STYLES.cancelled;
          const isEditable = msg.status === "pending";
          const isRescheduling = rescheduleId === msg.id;
          return (
            <div
              key={msg.id}
              className={`rounded-lg border border-[var(--border-strong)] p-3 ${msg.status === "cancelled" ? "opacity-50" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.text} font-medium`}>
                      {st.label}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-medium">
                      {SEQ_LABELS[msg.sequenceId] ?? msg.sequenceId}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      › {STEP_LABELS[msg.stepId] ?? msg.stepId}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    用戶：{msg.userId.slice(0, 20)}…
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {msg.status === "sent" && msg.sentAt
                      ? `已發送：${new Date(msg.sentAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`
                      : `預計發送：${new Date(msg.scheduledAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`}
                  </p>
                </div>

                {isEditable && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setRescheduleId(isRescheduling ? null : msg.id);
                        setError(null);
                      }}
                      disabled={isPending && actionId === msg.id}
                      className="text-xs text-blue-600 hover:text-blue-600 transition disabled:opacity-50"
                    >
                      重新排程
                    </button>
                    <button
                      onClick={() => handleCancel(msg.id)}
                      disabled={isPending && actionId === msg.id}
                      className="text-xs text-red-600 hover:text-red-600 transition disabled:opacity-50"
                    >
                      {actionId === msg.id ? "處理中…" : "取消"}
                    </button>
                  </div>
                )}
              </div>

              {isRescheduling && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="text-xs bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                  />
                  <button
                    onClick={() => handleReschedule(msg.id)}
                    disabled={isPending && actionId === msg.id}
                    className="text-xs bg-[var(--brand-primary)] hover:bg-[var(--text-secondary)] text-white rounded px-3 py-1 transition disabled:opacity-50"
                  >
                    確認
                  </button>
                  <button
                    onClick={() => { setRescheduleId(null); setRescheduleDate(""); }}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
