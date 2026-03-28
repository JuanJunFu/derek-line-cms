"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export function MobileSidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--bg-secondary)] border-b border-[var(--border-strong)] flex items-center justify-between px-4 h-12">
        <button
          onClick={() => setOpen(true)}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition p-1"
          aria-label="開啟選單"
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-medium tracking-wider text-[var(--text-primary)]">DEREK CMS</span>
        <div className="w-6" />
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-[var(--sidebar-bg)] border-r border-[var(--border-strong)]
          flex flex-col transition-transform duration-300 ease-[var(--motion-ease)]
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0 md:w-56 md:transition-none
        `}
      >
        {/* Close button (mobile only) */}
        <div className="md:hidden flex justify-end p-2">
          <button
            onClick={() => setOpen(false)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"
            aria-label="關閉選單"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </aside>
    </>
  );
}
