"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`block px-3 py-2 rounded-lg text-sm transition ${
        isActive
          ? "bg-gray-800 text-amber-400 font-medium"
          : "text-gray-300 hover:bg-gray-800 hover:text-amber-400"
      }`}
    >
      {children}
    </Link>
  );
}
