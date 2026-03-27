"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProductToggle({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch(`/api/v1/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !active }),
    });
    if (res.ok) {
      setActive(!active);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-2 py-1 rounded transition ${
        active
          ? "text-green-400 hover:text-green-300"
          : "text-gray-500 hover:text-gray-400"
      }`}
    >
      {active ? "● 啟用" : "○ 停用"}
    </button>
  );
}
