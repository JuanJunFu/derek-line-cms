"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StoreToggle({
  storeId,
  isActive: initialActive,
}: {
  storeId: string;
  isActive: boolean;
}) {
  const [isActive, setIsActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    const res = await fetch(`/api/v1/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      setIsActive(!isActive);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-sm font-medium ${
        isActive ? "text-green-400" : "text-gray-500"
      } hover:opacity-80 transition disabled:opacity-50`}
    >
      {isActive ? "● 啟用" : "○ 停用"}
    </button>
  );
}
