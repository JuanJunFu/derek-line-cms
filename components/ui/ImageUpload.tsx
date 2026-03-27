"use client";

import { useState, useCallback } from "react";

export function ImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 5 * 1024 * 1024) {
        alert("檔案太大，最大 5MB");
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/v1/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const { url } = await res.json();
          onChange(url);
        } else {
          const err = await res.json();
          alert(err.error || "上傳失敗");
        }
      } catch {
        alert("上傳失敗，請重試");
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  return (
    <div>
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="門市圖片"
            className="w-48 h-32 object-cover rounded-lg border border-gray-700"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center hover:bg-red-400"
          >
            ✕
          </button>
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center w-48 h-32 rounded-lg border-2 border-dashed cursor-pointer transition ${
            dragOver
              ? "border-amber-400 bg-amber-900/20"
              : "border-gray-700 bg-gray-800 hover:border-gray-600"
          } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <span className="text-2xl mb-1">{uploading ? "⏳" : "📷"}</span>
          <span className="text-xs text-gray-400">
            {uploading ? "上傳中..." : "點擊或拖放圖片"}
          </span>
        </label>
      )}
    </div>
  );
}
