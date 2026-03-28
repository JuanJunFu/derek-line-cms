import { prisma } from "@/lib/prisma";
import { SequenceTable } from "@/components/sequences/SequenceTable";

export const dynamic = "force-dynamic";

export default async function SequencesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = status ?? "pending";

  const where = activeStatus === "all" ? {} : { status: activeStatus };

  const [messages, counts] = await Promise.all([
    prisma.scheduledMessage.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      take: 100,
    }),
    prisma.scheduledMessage.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const countMap: Record<string, number> = {};
  for (const c of counts) countMap[c.status] = c._count;
  const total = Object.values(countMap).reduce((a, b) => a + b, 0);

  const tabs: { key: string; label: string; color: string }[] = [
    { key: "pending",   label: `⏳ 待發送 (${countMap.pending ?? 0})`,   color: "text-[var(--brand-accent)]" },
    { key: "sent",      label: `✅ 已發送 (${countMap.sent ?? 0})`,      color: "text-emerald-600" },
    { key: "cancelled", label: `✖ 已取消 (${countMap.cancelled ?? 0})`, color: "text-[var(--text-secondary)]"  },
    { key: "all",       label: `全部 (${total})`,                        color: "text-[var(--text-secondary)]"  },
  ];

  // Stats
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dueSoon = await prisma.scheduledMessage.count({
    where: { status: "pending", scheduledAt: { lte: next24h } },
  });

  // Per-sequence breakdown
  const seqBreakdown = await prisma.scheduledMessage.groupBy({
    by: ["sequenceId", "status"],
    _count: true,
  });

  const seqMap: Record<string, Record<string, number>> = {};
  for (const row of seqBreakdown) {
    if (!seqMap[row.sequenceId]) seqMap[row.sequenceId] = {};
    seqMap[row.sequenceId][row.status] = row._count;
  }

  const SEQ_LABELS: Record<string, string> = {
    hardcode_new_customer: "新客教育序列",
    hardcode_repair:       "維修服務序列",
  };

  return (
    <div className="max-w-full lg:max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">📬 序列訊息管理</h1>
        <a
          href="/sequences/editor"
          className="text-sm bg-[var(--brand-primary)] hover:bg-[var(--text-secondary)] text-white rounded-lg px-4 py-2 transition"
        >
          📝 序列定義編輯器
        </a>
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-6">
        管理自動化旅程中排定的 LINE 訊息 · Cron 每小時執行一次
      </p>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[var(--brand-accent)]">{countMap.pending ?? 0}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">待發送</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{dueSoon}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">24 小時內到期</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{countMap.sent ?? 0}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">已發送</p>
        </div>
      </div>

      {/* ── Per-sequence breakdown ── */}
      {Object.keys(seqMap).length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-xl p-4 mb-6">
          <h2 className="text-xs font-bold text-[var(--text-secondary)] mb-3">序列統計</h2>
          <div className="space-y-3">
            {Object.entries(seqMap).map(([seqId, statusCounts]) => {
              const sent      = statusCounts.sent ?? 0;
              const pending   = statusCounts.pending ?? 0;
              const cancelled = statusCounts.cancelled ?? 0;
              const seqTotal  = sent + pending + cancelled;
              const completePct = seqTotal > 0 ? Math.round((sent / seqTotal) * 100) : 0;
              return (
                <div key={seqId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[var(--text-secondary)]">{SEQ_LABELS[seqId] ?? seqId}</span>
                    <div className="flex gap-3 text-xs">
                      <span className="text-[var(--brand-accent)]">待發 {pending}</span>
                      <span className="text-emerald-600">已發 {sent}</span>
                      <span className="text-[var(--text-muted)]">取消 {cancelled}</span>
                    </div>
                  </div>
                  <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1.5">
                    <div
                      className="bg-[var(--brand-accent)] h-1.5 rounded-full"
                      style={{ width: `${completePct}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">發送進度 {completePct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab filters ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((tab) => (
          <a
            key={tab.key}
            href={`/sequences?status=${tab.key}`}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${
              activeStatus === tab.key
                ? "bg-[var(--bg-tertiary)] border-[var(--border-strong)] " + tab.color
                : "border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* ── Message Table ── */}
      <SequenceTable
        messages={messages.map((m) => ({
          ...m,
          scheduledAt: m.scheduledAt.toISOString(),
          sentAt: m.sentAt?.toISOString() ?? null,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
