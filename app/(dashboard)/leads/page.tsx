import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { HOT_DECAY_DAYS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// ── Tag → Chinese display name mapping ──
const TAG_ZH: Record<string, string> = {
  "Intent:Comfort_High": "馬桶/免治",
  "Intent:SmartToilet_High": "智慧馬桶",
  "Intent:Storage_Space": "面盆/浴櫃",
  "Intent:Quick_Fix": "龍頭更換",
  "Intent:Luxury_Living": "浴缸",
  "Intent:Safety_Care": "無障礙",
  "Intent:Maintenance": "配件",
  "Region:taipei": "大台北",
  "Region:hsinchu": "竹苗",
  "Region:taichung": "台中",
  "Region:tainan": "台南",
  "Region:kaohsiung": "高雄",
  "Status:High_Purchase_Intent": "高意圖",
  "Status:Needs_Human": "需人工",
  "Status:Blocked": "已封鎖",
  "Role:Service_Needed": "維修",
};

const REL_LEVEL_COLORS: Record<string, string> = {
  "新識": "text-gray-400",
  "認識": "text-blue-400",
  "熟識": "text-emerald-400",
  "信任": "text-amber-400",
  "忠誠": "text-orange-400",
};

export default async function LeadsPage() {
  const profiles = await prisma.userProfile.findMany({
    where: { isBlocked: false },
    orderBy: { lastActive: "desc" },
  });

  const now = Date.now();

  // Apply HOT time decay (90 days)
  const scored = profiles.map((p) => {
    let liveScore = p.leadScore;
    if (
      liveScore === "HOT" &&
      p.hotSince &&
      (now - p.hotSince.getTime()) / (1000 * 60 * 60 * 24) > HOT_DECAY_DAYS
    ) {
      const hasIntent = p.tags.some((t) => t.startsWith("Intent:"));
      liveScore = hasIntent ? "WARM" : "COLD";
    }
    return { ...p, liveScore };
  });

  // ── Quadrant classification ──
  // High relationship: 熟識/信任/忠誠 (score >= 41)
  // High intent: HOT
  const q_hotHigh = scored.filter((p) => p.liveScore === "HOT" && (p.relationshipScore ?? 0) >= 41);
  const q_hotLow  = scored.filter((p) => p.liveScore === "HOT" && (p.relationshipScore ?? 0) < 41);
  const q_coldHigh = scored.filter((p) => p.liveScore !== "HOT" && (p.relationshipScore ?? 0) >= 41);
  const q_coldLow  = scored.filter((p) => p.liveScore !== "HOT" && (p.relationshipScore ?? 0) < 41);

  const hot  = scored.filter((p) => p.liveScore === "HOT");
  const warm = scored.filter((p) => p.liveScore === "WARM");
  const cold = scored.filter((p) => p.liveScore === "COLD");

  // Fallback intercept: users with 3+ FALLBACK events in 24h
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const fallbackUsers = await prisma.userEvent.groupBy({
    by: ["userId"],
    where: { eventType: "FALLBACK", createdAt: { gte: oneDayAgo } },
    _count: true,
    having: { userId: { _count: { gte: 3 } } },
  });

  // SVG scatter plot data (top 200 by relationshipScore)
  const scatterProfiles = [...scored]
    .sort((a, b) => (b.relationshipScore ?? 0) - (a.relationshipScore ?? 0))
    .slice(0, 200);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-100 mb-6">🎯 客戶關係矩陣</h1>

      {/* ── Dual-track Matrix ── */}
      <div className="mb-6">
        <p className="text-xs text-gray-500 mb-3">
          X 軸：長期關係分（0-100）｜Y 軸：短期購買意圖（HOT/WARM/COLD）｜每點 = 一位客戶
        </p>

        {/* SVG Scatter Plot */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-4 overflow-x-auto">
          <ScatterPlot profiles={scatterProfiles} />
        </div>

        {/* 4-Quadrant Cards */}
        <div className="grid grid-cols-2 gap-3">
          <QuadrantCard
            emoji="🔥"
            title="立即跟進"
            subtitle="高意圖 × 高關係"
            count={q_hotHigh.length}
            desc="HOT + 熟識/信任/忠誠"
            color="border-red-700/50 bg-red-900/20"
            titleColor="text-red-400"
            leads={q_hotHigh.slice(0, 5)}
          />
          <QuadrantCard
            emoji="⚡"
            title="快速教育"
            subtitle="高意圖 × 低關係"
            count={q_hotLow.length}
            desc="HOT + 新識/認識"
            color="border-amber-700/50 bg-amber-900/20"
            titleColor="text-amber-400"
            leads={q_hotLow.slice(0, 5)}
          />
          <QuadrantCard
            emoji="💎"
            title="長期客戶"
            subtitle="低意圖 × 高關係"
            count={q_coldHigh.length}
            desc="WARM/COLD + 熟識以上"
            color="border-blue-700/50 bg-blue-900/20"
            titleColor="text-blue-400"
            leads={q_coldHigh.slice(0, 5)}
          />
          <QuadrantCard
            emoji="🌱"
            title="培育期"
            subtitle="低意圖 × 低關係"
            count={q_coldLow.length}
            desc="WARM/COLD + 新識/認識"
            color="border-gray-700/50 bg-gray-900/20"
            titleColor="text-gray-400"
            leads={q_coldLow.slice(0, 5)}
          />
        </div>
      </div>

      {/* Fallback intercept */}
      {fallbackUsers.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-bold text-red-400 mb-2">
            ⚠️ 需人工介入（24h 內觸發 3+ 次查無關鍵字）
          </h2>
          <div className="space-y-1">
            {fallbackUsers.map((u) => (
              <p key={u.userId} className="text-xs text-red-300">
                {u.userId} — {u._count} 次未匹配
              </p>
            ))}
          </div>
        </div>
      )}

      {/* HOT */}
      <LeadSection
        title="🔥 熱線索 (HOT)"
        subtitle={`90 天內有致電、導航或門市 LINE 互動（${hot.length} 人）`}
        leads={hot}
        color="text-red-400"
        bgColor="border-red-800/30"
      />

      {/* WARM */}
      <LeadSection
        title="🟠 溫線索 (WARM)"
        subtitle={`有產品分類或地區瀏覽行為（${warm.length} 人）`}
        leads={warm}
        color="text-amber-400"
        bgColor="border-amber-800/30"
      />

      {/* COLD */}
      <LeadSection
        title="❄️ 冷線索 (COLD)"
        subtitle={`僅加好友，無明顯意圖（${cold.length} 人）`}
        leads={cold}
        color="text-gray-400"
        bgColor="border-gray-800/30"
      />
    </div>
  );
}

// ── SVG Scatter Plot ──
function ScatterPlot({
  profiles,
}: {
  profiles: Array<{
    userId: string;
    liveScore: string;
    relationshipScore: number | null;
    totalEvents: number;
  }>;
}) {
  const W = 560, H = 180;
  const PAD = { left: 40, right: 16, top: 16, bottom: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const scoreToY: Record<string, number> = { HOT: 0.15, WARM: 0.5, COLD: 0.85 };
  const scoreToColor: Record<string, string> = {
    HOT: "#ef4444",
    WARM: "#f59e0b",
    COLD: "#6b7280",
  };

  // Deterministic jitter from userId
  function jitter(userId: string, range: number): number {
    let h = 0;
    for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) & 0xffff;
    return ((h % 1000) / 1000 - 0.5) * range;
  }

  const dots = profiles.map((p) => {
    const x = PAD.left + ((p.relationshipScore ?? 0) / 100) * innerW;
    const baseY = PAD.top + (scoreToY[p.liveScore] ?? 0.5) * innerH;
    const y = baseY + jitter(p.userId, innerH * 0.12);
    const r = Math.min(7, Math.max(3, Math.sqrt(p.totalEvents) * 0.8));
    return { x, y, r, color: scoreToColor[p.liveScore] ?? "#666", userId: p.userId };
  });

  const xTicks = [0, 25, 50, 75, 100];
  const xLabels = ["新識", "認識", "熟識", "信任", "忠誠"];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      {/* Grid lines */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#374151" strokeWidth="1" />
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#374151" strokeWidth="1" />
      {/* Vertical midline (score=50) */}
      <line
        x1={PAD.left + innerW * 0.5} y1={PAD.top}
        x2={PAD.left + innerW * 0.5} y2={H - PAD.bottom}
        stroke="#374151" strokeWidth="1" strokeDasharray="4,4"
      />
      {/* X ticks + labels */}
      {xTicks.map((t, i) => {
        const cx = PAD.left + (t / 100) * innerW;
        return (
          <g key={t}>
            <line x1={cx} y1={H - PAD.bottom} x2={cx} y2={H - PAD.bottom + 4} stroke="#4b5563" strokeWidth="1" />
            <text x={cx} y={H - PAD.bottom + 14} textAnchor="middle" fontSize="9" fill="#6b7280">{xLabels[i]}</text>
          </g>
        );
      })}
      {/* Y axis labels */}
      {(["HOT", "WARM", "COLD"] as const).map((s) => {
        const cy = PAD.top + scoreToY[s] * innerH;
        return (
          <text key={s} x={PAD.left - 4} y={cy + 3} textAnchor="end" fontSize="9" fill={scoreToColor[s]}>{s}</text>
        );
      })}
      {/* Dots */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.color} fillOpacity="0.7" />
      ))}
      {/* Legend */}
      <text x={W - PAD.right} y={PAD.top + 8} textAnchor="end" fontSize="8" fill="#4b5563">圓點大小 = 互動次數</text>
    </svg>
  );
}

// ── Quadrant Card ──
function QuadrantCard({
  emoji, title, subtitle, count, desc, color, titleColor, leads,
}: {
  emoji: string; title: string; subtitle: string;
  count: number; desc: string; color: string; titleColor: string;
  leads: Array<{ userId: string; displayName: string | null; relationshipScore: number | null; relationshipLevel: string | null }>;
}) {
  return (
    <div className={`rounded-xl border p-3 ${color}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className={`text-sm font-bold ${titleColor}`}>{emoji} {title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <span className={`text-2xl font-bold ${titleColor}`}>{count}</span>
      </div>
      <p className="text-xs text-gray-600 mb-2">{desc}</p>
      <div className="space-y-1">
        {leads.map((l) => (
          <Link key={l.userId} href={`/leads/${encodeURIComponent(l.userId)}`}
            className="flex items-center justify-between text-xs text-gray-400 hover:text-gray-200 transition">
            <span className="truncate max-w-[140px]">{l.displayName || l.userId.slice(0, 12) + "…"}</span>
            <span className={REL_LEVEL_COLORS[l.relationshipLevel ?? "新識"]}>{l.relationshipLevel ?? "新識"} {l.relationshipScore ?? 0}分</span>
          </Link>
        ))}
        {count > 5 && (
          <p className="text-xs text-gray-600">還有 {count - 5} 人…</p>
        )}
      </div>
    </div>
  );
}

// ── Lead List Section ──
function LeadSection({
  title, subtitle, leads, color, bgColor,
}: {
  title: string; subtitle: string;
  leads: Array<{
    userId: string; displayName: string | null; tags: string[];
    lastActive: Date; totalEvents: number; liveScore: string;
    relationshipScore: number | null; relationshipLevel: string | null;
    customerType: string | null;
  }>;
  color: string; bgColor: string;
}) {
  return (
    <div className={`mb-6 bg-gray-900 rounded-xl border ${bgColor} p-4`}>
      <h2 className={`text-sm font-bold ${color} mb-1`}>{title}</h2>
      <p className="text-xs text-gray-500 mb-3">{subtitle}</p>

      {leads.length === 0 ? (
        <p className="text-sm text-gray-500">無用戶</p>
      ) : (
        <div className="space-y-2">
          {leads.slice(0, 50).map((lead) => (
            <Link
              key={lead.userId}
              href={`/leads/${encodeURIComponent(lead.userId)}`}
              className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800 transition cursor-pointer"
            >
              <div className="min-w-0 flex-1 mr-3">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm text-gray-200 font-medium truncate">
                    {lead.displayName || lead.userId.slice(0, 12) + "..."}
                  </p>
                  {lead.customerType === "returning" && (
                    <span className="text-xs text-blue-400 shrink-0">🔄 老客戶</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {lead.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        tag.startsWith("Intent:") ? "bg-blue-900/40 text-blue-300"
                          : tag.startsWith("Region:") ? "bg-green-900/40 text-green-300"
                          : tag.startsWith("Status:") ? "bg-red-900/40 text-red-300"
                          : tag.startsWith("Role:") ? "bg-yellow-900/40 text-yellow-300"
                          : "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {TAG_ZH[tag] ?? tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                {/* Relationship score mini-bar */}
                <div className="flex items-center gap-1 mb-1 justify-end">
                  <span className={`text-xs ${REL_LEVEL_COLORS[lead.relationshipLevel ?? "新識"]}`}>
                    {lead.relationshipLevel ?? "新識"}
                  </span>
                  <div className="w-12 bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full"
                      style={{ width: `${lead.relationshipScore ?? 0}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">{lead.totalEvents} 次互動</p>
                <p className="text-xs text-gray-600">{timeAgo(lead.lastActive)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}
