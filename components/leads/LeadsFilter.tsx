"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SORT_OPTIONS, type Quadrant, type SortField } from "@/lib/lead-utils";

export interface FilterState {
  q: string;
  quadrant: Quadrant | null;
  sort: SortField;
  order: "asc" | "desc";
  tag: string | null;
  level: string | null;
  type: string | null;
}

interface LeadsFilterProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  total: number;
}

const LEVEL_OPTIONS = ["新識", "認識", "熟識", "信任", "忠誠"];
const TYPE_OPTIONS = [
  { value: "new", label: "新客戶" },
  { value: "returning", label: "老客戶 🔄" },
];

const TAG_PRESETS = [
  { value: "Intent:Comfort_High", label: "馬桶/免治" },
  { value: "Intent:SmartToilet_High", label: "智慧馬桶" },
  { value: "Intent:Storage_Space", label: "面盆/浴櫃" },
  { value: "Intent:Quick_Fix", label: "龍頭更換" },
  { value: "Intent:Luxury_Living", label: "浴缸" },
  { value: "Region:taipei", label: "大台北" },
  { value: "Region:hsinchu", label: "竹苗" },
  { value: "Region:taichung", label: "台中" },
  { value: "Region:tainan", label: "台南" },
  { value: "Region:kaohsiung", label: "高雄" },
  { value: "Status:High_Purchase_Intent", label: "高意圖" },
  { value: "Role:Service_Needed", label: "維修需求" },
];

export function LeadsFilter({ filters, onChange, total }: LeadsFilterProps) {
  const [searchInput, setSearchInput] = useState(filters.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange({ ...filters, q: value });
      }, 300);
    },
    [filters, onChange]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Sync external filter.q changes (e.g. when clearing all)
  useEffect(() => {
    setSearchInput(filters.q);
  }, [filters.q]);

  const chipBase =
    "text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer select-none";
  const chipActive = "border-amber-600 bg-amber-900/30 text-amber-400";
  const chipNormal =
    "border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600";

  const hasActiveFilters =
    filters.q || filters.quadrant || filters.tag || filters.level || filters.type;

  return (
    <div className="space-y-3">
      {/* Search + Sort row */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="搜尋客戶名稱 / userId ..."
            className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 text-sm">
            🔍
          </span>
        </div>

        <select
          value={filters.sort}
          onChange={(e) =>
            onChange({ ...filters, sort: e.target.value as SortField })
          }
          className="bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 px-3 py-2 focus:outline-none focus:border-amber-500"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          onClick={() =>
            onChange({ ...filters, order: filters.order === "desc" ? "asc" : "desc" })
          }
          className="bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-400 px-3 py-2 hover:text-gray-200 transition"
          title={filters.order === "desc" ? "降序" : "升序"}
        >
          {filters.order === "desc" ? "↓ 降序" : "↑ 升序"}
        </button>
      </div>

      {/* Filter chips row */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-gray-600 mr-1">篩選：</span>

        {/* Relationship level */}
        {LEVEL_OPTIONS.map((lv) => (
          <button
            key={lv}
            className={`${chipBase} ${filters.level === lv ? chipActive : chipNormal}`}
            onClick={() =>
              onChange({ ...filters, level: filters.level === lv ? null : lv })
            }
          >
            {lv}
          </button>
        ))}

        <span className="text-gray-700 mx-1">|</span>

        {/* Customer type */}
        {TYPE_OPTIONS.map((t) => (
          <button
            key={t.value}
            className={`${chipBase} ${filters.type === t.value ? chipActive : chipNormal}`}
            onClick={() =>
              onChange({ ...filters, type: filters.type === t.value ? null : t.value })
            }
          >
            {t.label}
          </button>
        ))}

        <span className="text-gray-700 mx-1">|</span>

        {/* Tag presets */}
        {TAG_PRESETS.map((t) => (
          <button
            key={t.value}
            className={`${chipBase} ${filters.tag === t.value ? chipActive : chipNormal}`}
            onClick={() =>
              onChange({ ...filters, tag: filters.tag === t.value ? null : t.value })
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Result count + clear */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">
          共 <span className="text-gray-400">{total}</span> 位客戶
        </p>
        {hasActiveFilters && (
          <button
            onClick={() =>
              onChange({
                q: "",
                quadrant: null,
                sort: "lastActive",
                order: "desc",
                tag: null,
                level: null,
                type: null,
              })
            }
            className="text-xs text-red-400 hover:text-red-300 transition"
          >
            清除所有篩選
          </button>
        )}
      </div>
    </div>
  );
}
