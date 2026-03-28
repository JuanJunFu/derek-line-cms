"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pagination } from "@/components/ui/Pagination";
import { LeadsFilter, type FilterState } from "@/components/leads/LeadsFilter";
import {
  TAG_ZH,
  REL_LEVEL_COLORS,
  timeAgo,
  getTagStyle,
  QUADRANT_META,
  type Quadrant,
  type ScoredProfile,
} from "@/lib/lead-utils";

interface ApiResponse {
  data: ScoredProfile[];
  total: number;
  page: number;
  totalPages: number;
  quadrantCounts: Record<Quadrant, number>;
}

const INITIAL_FILTERS: FilterState = {
  q: "",
  quadrant: null,
  sort: "lastActive",
  order: "desc",
  tag: null,
  level: null,
  type: null,
};

export function LeadsClient() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDot, setHoveredDot] = useState<ScoredProfile | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    params.set("sort", filters.sort);
    params.set("order", filters.order);
    if (filters.q) params.set("q", filters.q);
    if (filters.quadrant) params.set("quadrant", filters.quadrant);
    if (filters.tag) params.set("tag", filters.tag);
    if (filters.level) params.set("level", filters.level);
    if (filters.type) params.set("type", filters.type);

    try {
      const res = await fetch(`/api/v1/leads?${params.toString()}`);
      if (res.ok) {
        const json: ApiResponse = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleQuadrantClick = useCallback(
    (q: Quadrant) => {
      const next = filters.quadrant === q ? null : q;
      setFilters((prev) => ({ ...prev, quadrant: next }));
      setPage(1);
    },
    [filters.quadrant]
  );

  const quadrantCounts = data?.quadrantCounts ?? {
    hot_high: 0,
    hot_low: 0,
    cold_high: 0,
    cold_low: 0,
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-6">🎯 客戶關係矩陣</h1>

      {/* ── Scatter Plot ── */}
      {data && data.data.length > 0 && (
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4 mb-4 overflow-x-auto">
          <p className="text-xs text-[var(--text-muted)] mb-2">
            X 軸：長期關係分（0-100）｜Y 軸：短期購買意圖（HOT/WARM/COLD）｜每點 = 一位客戶
          </p>
          <ScatterPlot
            profiles={data.data}
            hoveredDot={hoveredDot}
            onHover={setHoveredDot}
          />
        </div>
      )}

      {/* ── 4-Quadrant Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {(["hot_high", "hot_low", "cold_high", "cold_low"] as Quadrant[]).map((q) => {
          const meta = QUADRANT_META[q];
          const count = quadrantCounts[q];
          const isActive = filters.quadrant === q;
          const leads = data?.data.filter((p) => p.quadrant === q).slice(0, 3) ?? [];

          return (
            <button
              key={q}
              onClick={() => handleQuadrantClick(q)}
              className={`rounded-xl border p-3 text-left transition ${meta.color} ${
                isActive ? "ring-2 ring-amber-500" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className={`text-sm font-bold ${meta.titleColor}`}>
                    {meta.emoji} {meta.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{meta.subtitle}</p>
                </div>
                <span className={`text-2xl font-bold ${meta.titleColor}`}>
                  {count}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-2">{meta.desc}</p>
              <div className="space-y-1">
                {leads.map((l) => (
                  <div
                    key={l.userId}
                    className="flex items-center justify-between text-xs text-[var(--text-secondary)]"
                  >
                    <span className="truncate max-w-[140px]">
                      {l.displayName || l.userId.slice(0, 12) + "…"}
                    </span>
                    <span
                      className={
                        REL_LEVEL_COLORS[l.relationshipLevel ?? "新識"]
                      }
                    >
                      {l.relationshipLevel} {l.relationshipScore}分
                    </span>
                  </div>
                ))}
                {count > 3 && (
                  <p className="text-xs text-[var(--text-muted)]">
                    還有 {count - 3} 人…
                  </p>
                )}
              </div>
              {isActive && (
                <p className="text-xs text-[var(--brand-accent)] mt-2">
                  ✓ 篩選中（再點取消）
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <LeadsFilter
        filters={filters}
        onChange={handleFilterChange}
        total={data?.total ?? 0}
      />

      {/* ── Lead List ── */}
      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="text-center py-12 text-[var(--text-muted)] text-sm">
            載入中...
          </div>
        ) : data && data.data.length > 0 ? (
          data.data.map((lead) => (
            <LeadRow key={lead.userId} lead={lead} />
          ))
        ) : (
          <div className="text-center py-12 text-[var(--text-muted)] text-sm">
            {filters.q || filters.quadrant || filters.tag || filters.level || filters.type
              ? "沒有符合條件的客戶"
              : "尚無客戶資料"}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {data && data.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

// ── Lead Row ──
function LeadRow({ lead }: { lead: ScoredProfile }) {
  const scoreColors: Record<string, string> = {
    HOT: "text-red-600",
    WARM: "text-[var(--brand-accent)]",
    COLD: "text-[var(--text-secondary)]",
  };

  return (
    <Link
      href={`/leads/${encodeURIComponent(lead.userId)}`}
      className="flex items-center justify-between bg-[var(--bg-tertiary)]/50 rounded-lg p-3 hover:bg-[var(--bg-tertiary)] transition cursor-pointer"
    >
      <div className="min-w-0 flex-1 mr-3">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-xs font-bold ${scoreColors[lead.liveScore] ?? "text-[var(--text-secondary)]"}`}
          >
            {lead.liveScore}
          </span>
          <p className="text-sm text-[var(--text-primary)] font-medium truncate">
            {lead.displayName || lead.userId.slice(0, 12) + "..."}
          </p>
          {lead.customerType === "returning" && (
            <span className="text-xs text-blue-600 shrink-0">
              🔄 老客戶
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {lead.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className={`text-xs px-1.5 py-0.5 rounded ${getTagStyle(tag)}`}
            >
              {TAG_ZH[tag] ?? tag}
            </span>
          ))}
          {lead.tags.length > 4 && (
            <span className="text-xs text-[var(--text-muted)]">
              +{lead.tags.length - 4}
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1 mb-1 justify-end">
          <span
            className={`text-xs ${
              REL_LEVEL_COLORS[lead.relationshipLevel ?? "新識"]
            }`}
          >
            {lead.relationshipLevel}
          </span>
          <div className="w-12 bg-[var(--border-strong)] rounded-full h-1.5">
            <div
              className="bg-[var(--brand-accent)] h-1.5 rounded-full"
              style={{
                width: `${Math.min(100, lead.relationshipScore)}%`,
              }}
            />
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {lead.totalEvents} 次互動
        </p>
        <p className="text-xs text-[var(--text-muted)]">{timeAgo(lead.lastActive)}</p>
      </div>
    </Link>
  );
}

// ── SVG Scatter Plot with hover ──
function ScatterPlot({
  profiles,
  hoveredDot,
  onHover,
}: {
  profiles: ScoredProfile[];
  hoveredDot: ScoredProfile | null;
  onHover: (p: ScoredProfile | null) => void;
}) {
  const W = 560,
    H = 180;
  const PAD = { left: 40, right: 16, top: 16, bottom: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const scoreToY: Record<string, number> = { HOT: 0.15, WARM: 0.5, COLD: 0.85 };
  const scoreToColor: Record<string, string> = {
    HOT: "#ef4444",
    WARM: "#f59e0b",
    COLD: "#6b7280",
  };

  function jitter(userId: string, range: number): number {
    let h = 0;
    for (let i = 0; i < userId.length; i++)
      h = (h * 31 + userId.charCodeAt(i)) & 0xffff;
    return ((h % 1000) / 1000 - 0.5) * range;
  }

  const dots = profiles.map((p) => {
    const x = PAD.left + (p.relationshipScore / 100) * innerW;
    const baseY = PAD.top + (scoreToY[p.liveScore] ?? 0.5) * innerH;
    const y = baseY + jitter(p.userId, innerH * 0.12);
    const r = Math.min(7, Math.max(3, Math.sqrt(p.totalEvents) * 0.8));
    return {
      x,
      y,
      r,
      color: scoreToColor[p.liveScore] ?? "#666",
      profile: p,
    };
  });

  const xLabels = ["新識", "認識", "熟識", "信任", "忠誠"];
  const xTicks = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      {/* Grid */}
      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={H - PAD.bottom}
        stroke="#374151"
        strokeWidth="1"
      />
      <line
        x1={PAD.left}
        y1={H - PAD.bottom}
        x2={W - PAD.right}
        y2={H - PAD.bottom}
        stroke="#374151"
        strokeWidth="1"
      />
      <line
        x1={PAD.left + innerW * 0.5}
        y1={PAD.top}
        x2={PAD.left + innerW * 0.5}
        y2={H - PAD.bottom}
        stroke="#374151"
        strokeWidth="1"
        strokeDasharray="4,4"
      />

      {/* X axis */}
      {xTicks.map((t, i) => {
        const cx = PAD.left + (t / 100) * innerW;
        return (
          <g key={t}>
            <line
              x1={cx}
              y1={H - PAD.bottom}
              x2={cx}
              y2={H - PAD.bottom + 4}
              stroke="#4b5563"
              strokeWidth="1"
            />
            <text
              x={cx}
              y={H - PAD.bottom + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#6b7280"
            >
              {xLabels[i]}
            </text>
          </g>
        );
      })}

      {/* Y axis */}
      {(["HOT", "WARM", "COLD"] as const).map((s) => {
        const cy = PAD.top + scoreToY[s] * innerH;
        return (
          <text
            key={s}
            x={PAD.left - 4}
            y={cy + 3}
            textAnchor="end"
            fontSize="9"
            fill={scoreToColor[s]}
          >
            {s}
          </text>
        );
      })}

      {/* Dots */}
      {dots.map((d, i) => {
        const isHovered = hoveredDot?.userId === d.profile.userId;
        return (
          <g key={i}>
            <circle
              cx={d.x}
              cy={d.y}
              r={isHovered ? d.r + 2 : d.r}
              fill={d.color}
              fillOpacity={isHovered ? 1 : 0.7}
              stroke={isHovered ? "#fff" : "none"}
              strokeWidth={isHovered ? 1.5 : 0}
              style={{ cursor: "pointer", transition: "r 0.15s" }}
              onMouseEnter={() => onHover(d.profile)}
              onMouseLeave={() => onHover(null)}
            />
            {/* Tooltip */}
            {isHovered && (
              <g>
                <rect
                  x={d.x - 50}
                  y={d.y - 26}
                  width={100}
                  height={18}
                  rx={4}
                  fill="#1f2937"
                  stroke="#4b5563"
                  strokeWidth="0.5"
                />
                <text
                  x={d.x}
                  y={d.y - 14}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#e5e7eb"
                >
                  {d.profile.displayName || d.profile.userId.slice(0, 16)}
                  {" "}
                  ({d.profile.relationshipScore}分)
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Legend */}
      <text
        x={W - PAD.right}
        y={PAD.top + 8}
        textAnchor="end"
        fontSize="8"
        fill="#4b5563"
      >
        圓點大小 = 互動次數 · hover 顯示名稱
      </text>
    </svg>
  );
}
