"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  id: string;
  userId: string;
  direction: string;
  msgType: string;
  content: any;
  createdAt: string;
}

export function ChatLog({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/v1/chat/${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          // API returns desc order, reverse for chronological display
          setMessages((data.messages as ChatMessage[]).reverse());
        }
      } catch (err) {
        console.error("Failed to fetch chat messages:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMessages();
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function renderContent(msg: ChatMessage): string {
    const content = msg.content as any;
    if (msg.msgType === "text") {
      return content?.text ?? "";
    }
    if (msg.msgType === "postback") {
      return content?.displayText ?? content?.data ?? "[Postback]";
    }
    if (msg.msgType === "flex") {
      return `[Flex 訊息] ${content?.altText ?? ""}`;
    }
    if (msg.msgType === "image") {
      return "[圖片]";
    }
    if (msg.msgType === "sticker") {
      return "[貼圖]";
    }
    return JSON.stringify(content);
  }

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei",
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

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--text-muted)] text-sm">
        尚無對話紀錄
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
      {messages.map((msg) => {
        const isInbound = msg.direction === "inbound";
        return (
          <div
            key={msg.id}
            className={`flex ${isInbound ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[75%] rounded-xl px-3 py-2 ${
                isInbound
                  ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                  : "bg-[var(--brand-primary)] text-white"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">
                {renderContent(msg)}
              </p>
              <p
                className={`text-xs mt-1 ${
                  isInbound ? "text-[var(--text-muted)]" : "text-white/70"
                }`}
              >
                {formatTime(msg.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
