"use client";

import { useState, useEffect } from "react";
import { NavLink } from "./NavLink";
import { ThemeSwitcher } from "./ThemeSwitcher";

type NavGroup = {
  label: string;
  icon: string;
  items: { href: string; label: string }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "管理",
    icon: "⚙️",
    items: [
      { href: "/stores", label: "門市管理" },
      { href: "/regions", label: "地區管理" },
      { href: "/products", label: "產品分類" },
      { href: "/users", label: "使用者管理" },
      { href: "/settings", label: "系統設定" },
    ],
  },
  {
    label: "行銷",
    icon: "📣",
    items: [
      { href: "/broadcasts", label: "群發推播" },
      { href: "/sequences", label: "序列管理" },
      { href: "/rich-menus", label: "圖文選單" },
      { href: "/replies", label: "自動回覆" },
    ],
  },
  {
    label: "客戶",
    icon: "👥",
    items: [
      { href: "/leads", label: "客戶矩陣" },
      { href: "/referrals", label: "推薦管理" },
      { href: "/segments", label: "受眾分群" },
      { href: "/tags", label: "標籤管理" },
    ],
  },
  {
    label: "數據",
    icon: "📊",
    items: [
      { href: "/analytics", label: "互動分析" },
      { href: "/war-room", label: "戰情室" },
      { href: "/analytics/stores", label: "據點表現" },
      { href: "/analytics/keywords", label: "詞雲分析" },
      { href: "/graph", label: "關係圖" },
      { href: "/alerts", label: "通知中心" },
    ],
  },
];

export function SidebarNav({ userName }: { userName?: string | null }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("derek-nav-collapsed");
      if (saved) setCollapsed(JSON.parse(saved));
    } catch {}
  }, []);

  function toggleGroup(label: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      localStorage.setItem("derek-nav-collapsed", JSON.stringify(next));
      return next;
    });
  }

  return (
    <>
      <div className="px-5 py-5 border-b border-[var(--border-strong)]">
        <h1 className="text-base font-semibold tracking-[0.12em] text-[var(--text-primary)]">
          DEREK
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 tracking-wider">
          德瑞克衛浴 CMS
        </p>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            <button
              onClick={() => toggleGroup(group.label)}
              className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hover:text-[var(--text-secondary)] transition"
            >
              <span className="flex items-center gap-1.5">
                <span>{group.icon}</span>
                <span>{group.label}</span>
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform duration-200 ${
                  collapsed[group.label] ? "-rotate-90" : ""
                }`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {!collapsed[group.label] && (
              <div className="space-y-0.5 mb-2">
                {group.items.map((item) => (
                  <NavLink key={item.href} href={item.href}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-[var(--border-strong)] space-y-2">
        <ThemeSwitcher />
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)] truncate">{userName}</p>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-xs text-[var(--text-muted)] hover:text-[var(--status-hot)] transition-colors duration-200"
            >
              登出
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
