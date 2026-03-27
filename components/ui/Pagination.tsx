"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build page numbers to show: [1, ..., page-1, page, page+1, ..., totalPages]
  const pages: (number | "...")[] = [];
  const addPage = (p: number) => {
    if (p >= 1 && p <= totalPages && !pages.includes(p)) pages.push(p);
  };

  addPage(1);
  if (page > 3) pages.push("...");
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
    addPage(i);
  }
  if (page < totalPages - 2) pages.push("...");
  addPage(totalPages);

  const btnBase =
    "px-3 py-1.5 text-xs rounded-lg border transition";
  const btnActive =
    "bg-amber-600 border-amber-600 text-white";
  const btnNormal =
    "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600";
  const btnDisabled =
    "border-gray-800 text-gray-600 cursor-not-allowed";

  return (
    <div className="flex items-center justify-center gap-1.5 mt-4">
      <button
        className={`${btnBase} ${page <= 1 ? btnDisabled : btnNormal}`}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← 上一頁
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="text-gray-600 px-1">
            …
          </span>
        ) : (
          <button
            key={p}
            className={`${btnBase} ${p === page ? btnActive : btnNormal}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        )
      )}

      <button
        className={`${btnBase} ${page >= totalPages ? btnDisabled : btnNormal}`}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        下一頁 →
      </button>
    </div>
  );
}
