"use client";

import { useState, type ReactNode } from "react";
import { ChatLog } from "@/components/leads/ChatLog";
import { UserNotes } from "@/components/leads/UserNotes";

const TABS = [
  { key: "overview", label: "概覽" },
  { key: "chat", label: "對話紀錄" },
  { key: "notes", label: "備註" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function UserDetailTabs({
  userId,
  overviewContent,
}: {
  userId: string;
  overviewContent: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div>
      {/* Tab navigation */}
      <div className="flex gap-0 border-b border-[var(--border-strong)] mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-[var(--brand-accent)] text-[var(--brand-accent)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && overviewContent}
      {activeTab === "chat" && <ChatLog userId={userId} />}
      {activeTab === "notes" && <UserNotes userId={userId} />}
    </div>
  );
}
