"use client";

import { useState, useEffect } from "react";

const THEMES = [
  { id: "theme-corporate", label: "Corporate", icon: "🏢", desc: "專業藍灰" },
  { id: "theme-minimal", label: "Minimal", icon: "🎋", desc: "日式暖棕" },
  { id: "theme-dark", label: "Dark", icon: "🌙", desc: "深色護眼" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

export function ThemeSwitcher() {
  const [current, setCurrent] = useState<ThemeId>("theme-corporate");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("derek-theme") as ThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setCurrent(saved);
      applyTheme(saved);
    }
  }, []);

  function applyTheme(themeId: ThemeId) {
    const html = document.documentElement;
    THEMES.forEach((t) => html.classList.remove(t.id));
    html.classList.add(themeId);
    localStorage.setItem("derek-theme", themeId);
  }

  function selectTheme(themeId: ThemeId) {
    setCurrent(themeId);
    applyTheme(themeId);
    setOpen(false);
  }

  const currentTheme = THEMES.find((t) => t.id === current)!;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition"
        title="切換主題"
      >
        <span>{currentTheme.icon}</span>
        <span className="hidden sm:inline">{currentTheme.desc}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-1 z-50 bg-[var(--card-bg)] border border-[var(--border-strong)] rounded-lg shadow-lg py-1 min-w-[140px]">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => selectTheme(theme.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition hover:bg-[var(--bg-tertiary)] ${
                  current === theme.id
                    ? "text-[var(--brand-accent)] font-medium"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                <span>{theme.icon}</span>
                <span>{theme.label}</span>
                <span className="text-[var(--text-muted)]">{theme.desc}</span>
                {current === theme.id && <span className="ml-auto">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
