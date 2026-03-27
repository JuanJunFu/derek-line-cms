"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Silent client-side page refresher.
 * Calls router.refresh() every `intervalMs` milliseconds to re-fetch server data.
 */
export function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
