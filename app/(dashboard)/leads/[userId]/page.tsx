import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const EVENT_NAMES: Record<string, string> = {
  FOLLOW: "✅ 加入好友",
  UNFOLLOW: "❌ 封鎖/退出",
  MESSAGE: "💬 發送訊息",
  REGION_SELECT: "📍 選擇地區",
  STORE_VIEW: "🏪 查看門市",
  STORE_CALL: "📞 致電門市",
  STORE_NAV: "🗺️ 導航至門市",
  STORE_LINE: "💬 門市 LINE 聯絡",
  PRODUCT_VIEW: "🛁 瀏覽產品",
  FALLBACK: "⚠️ 未匹配關鍵字",
  POSTBACK: "👆 點擊按鈕",
  SEQUENCE_COMPLETE: "🎯 完成序列",
};

const TAG_ZH: Record<string, string> = {
  "Intent:Comfort_High": "需求：馬桶/免治",
  "Intent:SmartToilet_High": "需求：智慧馬桶",
  "Intent:Storage_Space": "需求：面盆/浴櫃",
  "Intent:Quick_Fix": "需求：龍頭更換",
  "Intent:Luxury_Living": "需求：浴缸",
  "Intent:Safety_Care": "需求：無障礙設備",
  "Intent:Maintenance": "需求：配件/維護",
  "Region:taipei": "地區：大台北",
  "Region:hsinchu": "地區：竹苗",
  "Region:taichung": "地區：台中",
  "Region:tainan": "地區：台南",
  "Region:kaohsiung": "地區：高雄",
  "Status:High_Purchase_Intent": "高購買意圖",
  "Status:Needs_Human": "需人工介入",
  "Status:Blocked": "已封鎖",
  "Role:Service_Needed": "維修需求",
};

function getEventDotColor(eventType: string): string {
  if (eventType === "FOLLOW") return "bg-green-500";
  if (eventType === "UNFOLLOW") return "bg-red-500";
  if (["STORE_CALL", "STORE_NAV", "STORE_LINE"].includes(eventType)) return "bg-[var(--brand-accent)]";
  if (eventType === "PRODUCT_VIEW") return "bg-blue-500";
  if (eventType === "REGION_SELECT") return "bg-emerald-500";
  if (eventType === "MESSAGE") return "bg-purple-500";
  if (eventType === "SEQUENCE_COMPLETE") return "bg-[var(--brand-accent)]";
  return "bg-[var(--text-muted)]";
}

function buildAiSuggestion(
  tags: string[],
  leadScore: string,
  relationshipLevel: string,
  customerType: string,
  lastActiveDate: Date
): string {
  const daysSince = Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
  const isReturning = customerType === "returning";

  if (leadScore === "HOT" && tags.includes("Status:High_Purchase_Intent")) {
    const region = tags.find((t) => t.startsWith("Region:"))?.replace("Region:", "");
    return `🔥 此客戶正在高購買意圖中${region ? `（${region}地區）` : ""}，建議立即推送最近${region ?? ""}門市的到店體驗邀請。`;
  }
  if (isReturning && tags.includes("Role:Service_Needed")) {
    return `🔧 維修需求已觸發，已自動啟動維修序列。3天後將推送升級推薦訊息，請業務同步追蹤。`;
  }
  if (tags.includes("Intent:SmartToilet_High")) {
    return `🧠 有強烈智慧馬桶意圖，建議推播信義/台中旗艦店的智慧馬桶實機體驗活動邀請。`;
  }
  if (leadScore === "WARM" && daysSince > 14) {
    return `💤 已有 ${daysSince} 天未互動，建議透過序列傳送一則保養小知識喚回注意力。`;
  }
  if (relationshipLevel === "新識" || relationshipLevel === "認識") {
    return `🌱 仍在培育期（${relationshipLevel}），新客教育序列正在進行中，繼續觀察 7 天後再主動推播。`;
  }
  return `📊 客戶狀態正常，目前關係等級「${relationshipLevel}」，繼續透過序列維持定期接觸。`;
}

export default async function UserTimelinePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const decodedUserId = decodeURIComponent(userId);

  const profile = await prisma.userProfile.findUnique({
    where: { userId: decodedUserId },
  });

  if (!profile) notFound();

  // Fetch all events (no 30-day limit — full history)
  const events = await prisma.userEvent.findMany({
    where: { userId: decodedUserId },
    orderBy: { createdAt: "asc" }, // oldest first for timeline
    take: 500,
  });

  // Scheduled messages for this user
  const scheduledMessages = await prisma.scheduledMessage.findMany({
    where: { userId: decodedUserId },
    orderBy: { scheduledAt: "asc" },
  });

  // Referral data
  const [referralsAsReferrer, referralAsReferee] = await Promise.all([
    prisma.referral.findMany({
      where: { referrerUserId: decodedUserId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.referral.findFirst({
      where: { refereeUserId: decodedUserId, status: "COMPLETED" },
    }),
  ]);
  // Lookup display names for referral participants
  const refUserIds = [
    ...new Set([
      ...referralsAsReferrer.map((r) => r.refereeUserId).filter(Boolean) as string[],
      referralAsReferee?.referrerUserId,
    ].filter(Boolean) as string[]),
  ];
  const refProfiles = refUserIds.length > 0
    ? await prisma.userProfile.findMany({
        where: { userId: { in: refUserIds } },
        select: { userId: true, displayName: true },
      })
    : [];
  const refProfileMap = Object.fromEntries(refProfiles.map((p) => [p.userId, p]));

  const scoreColors: Record<string, string> = {
    HOT: "text-red-600 bg-red-50 border border-red-300",
    WARM: "text-[var(--brand-accent)] bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/30",
    COLD: "text-[var(--text-secondary)] bg-[var(--bg-tertiary)] border border-[var(--border-strong)]",
  };

  const relLevelColors: Record<string, string> = {
    "新識": "text-[var(--text-secondary)]",
    "認識": "text-blue-600",
    "熟識": "text-emerald-400",
    "信任": "text-[var(--brand-accent)]",
    "忠誠": "text-orange-400",
  };

  const aiSuggestion = buildAiSuggestion(
    profile.tags,
    profile.leadScore,
    profile.relationshipLevel ?? "新識",
    profile.customerType ?? "new",
    profile.lastActive
  );

  const sequenceState = (profile.sequenceState as Record<string, any>) ?? {};

  return (
    <div className="max-w-3xl">
      <Link
        href="/leads"
        className="text-[var(--brand-accent)] hover:text-[var(--brand-accent)] text-sm mb-4 inline-block"
      >
        ← 返回客戶列表
      </Link>

      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">
        {profile.displayName || decodedUserId}
      </h1>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        LINE ID: {decodedUserId} ·
        {profile.customerType === "returning" ? " 老客戶 🔄" : " 新客戶 🌱"} ·
        首次加入 {profile.firstSeen.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}
      </p>

      {/* ── Dual-track Score Card ── */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Lead score */}
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${scoreColors[profile.leadScore]}`}>
              {profile.leadScore === "HOT" ? "🔥 HOT" : profile.leadScore === "WARM" ? "🟠 WARM" : "❄️ COLD"}
            </span>
            {/* Relationship level */}
            <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-[var(--bg-tertiary)] border border-[var(--border-strong)] ${relLevelColors[profile.relationshipLevel ?? "新識"]}`}>
              關係：{profile.relationshipLevel ?? "新識"}（{profile.relationshipScore ?? 0}分）
            </span>
            {profile.isBlocked && (
              <span className="px-2 py-1 rounded-full text-xs bg-red-50 text-red-600">已封鎖</span>
            )}
          </div>
          <div className="text-right text-xs text-[var(--text-muted)] shrink-0 ml-2">
            <p>共 {profile.totalEvents} 次互動</p>
            <p>最後：{profile.lastActive.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}</p>
          </div>
        </div>

        {/* Relationship score bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
            <span>關係分 {profile.relationshipScore ?? 0}/100</span>
            <span>目標：下一等級</span>
          </div>
          <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2">
            <div
              className="bg-[var(--brand-accent)] h-2 rounded-full transition-all"
              style={{ width: `${profile.relationshipScore ?? 0}%` }}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {profile.tags.map((tag) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded ${
                tag.startsWith("Intent:")
                  ? "bg-blue-50 text-blue-600"
                  : tag.startsWith("Region:")
                    ? "bg-emerald-50 text-emerald-600"
                    : tag.startsWith("Status:")
                      ? "bg-red-50 text-red-600"
                      : tag.startsWith("Role:")
                        ? "bg-yellow-50 text-yellow-600"
                        : "bg-[var(--border-strong)] text-[var(--text-secondary)]"
              }`}
            >
              {TAG_ZH[tag] ?? tag}
            </span>
          ))}
          {profile.tags.length === 0 && (
            <span className="text-xs text-[var(--text-muted)]">尚無標籤</span>
          )}
        </div>
      </div>

      {/* ── AI Suggestion ── */}
      <div className="bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20 rounded-xl p-3 mb-4">
        <p className="text-xs font-bold text-[var(--brand-accent)] mb-1">💡 建議行動</p>
        <p className="text-sm text-[var(--text-primary)]">{aiSuggestion}</p>
      </div>

      {/* ── Referral Relationships ── */}
      {(referralAsReferee || referralsAsReferrer.length > 0) && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-xl p-3 mb-4">
          <p className="text-xs font-bold text-[var(--text-secondary)] mb-2">🤝 推薦關係</p>

          {/* Who referred this user */}
          {referralAsReferee && (
            <div className="flex items-center gap-2 text-xs mb-2">
              <span className="text-[var(--text-muted)]">被推薦人：由</span>
              <Link
                href={`/leads/${encodeURIComponent(referralAsReferee.referrerUserId)}`}
                className="text-[var(--brand-accent)] hover:text-[var(--brand-accent)]"
              >
                {refProfileMap[referralAsReferee.referrerUserId]?.displayName ??
                  referralAsReferee.referrerUserId.slice(0, 12) + "…"}
              </Link>
              <span className="text-[var(--text-muted)]">推薦（碼：{referralAsReferee.code}）</span>
            </div>
          )}

          {/* Users this person referred */}
          {referralsAsReferrer.length > 0 && (
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">
                推薦人：已推薦 {referralsAsReferrer.filter((r) => r.status === "COMPLETED").length} 人
                {referralsAsReferrer.filter((r) => r.status === "PENDING").length > 0 &&
                  `（${referralsAsReferrer.filter((r) => r.status === "PENDING").length} 組待使用）`}
              </p>
              <div className="space-y-1">
                {referralsAsReferrer.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-[var(--brand-accent)]">{r.code}</span>
                    <span className={r.status === "COMPLETED" ? "text-emerald-600" : "text-[var(--text-muted)]"}>
                      {r.status === "COMPLETED" ? "✅" : "⏳"}
                    </span>
                    {r.refereeUserId ? (
                      <Link
                        href={`/leads/${encodeURIComponent(r.refereeUserId)}`}
                        className="text-[var(--text-secondary)] hover:text-[var(--brand-accent)]"
                      >
                        {refProfileMap[r.refereeUserId]?.displayName ??
                          r.refereeUserId.slice(0, 12) + "…"}
                      </Link>
                    ) : (
                      <span className="text-[var(--text-muted)]">等待使用</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Sequence State ── */}
      {Object.keys(sequenceState).length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-xl p-3 mb-4">
          <p className="text-xs font-bold text-[var(--text-secondary)] mb-2">📬 序列狀態</p>
          <div className="space-y-1">
            {sequenceState.new_customer && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">新客教育序列</span>
                <span className={sequenceState.new_customer.completedAt ? "text-emerald-600" : "text-[var(--brand-accent)]"}>
                  {sequenceState.new_customer.completedAt ? "✅ 已完成" : "⏳ 進行中"}
                </span>
              </div>
            )}
            {sequenceState.repair && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">維修服務序列</span>
                <span className={sequenceState.repair.completedAt ? "text-emerald-600" : "text-[var(--brand-accent)]"}>
                  {sequenceState.repair.completedAt ? "✅ 已完成" : "⏳ 進行中"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Journey Timeline ── */}
      <h2 className="text-sm font-bold text-[var(--brand-accent)] mb-4">
        🕐 完整旅程時間軸（{events.length} 筆事件）
      </h2>

      {events.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">無紀錄</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--bg-tertiary)]" />

          <div className="space-y-0">
            {events.map((event, i) => {
              const eventData = event.data as Record<string, any>;
              const prevEvent = events[i - 1];
              const showDate =
                !prevEvent ||
                event.createdAt.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" }) !==
                prevEvent.createdAt.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });

              return (
                <div key={event.id}>
                  {showDate && (
                    <div className="pl-10 py-2">
                      <span className="text-xs font-bold text-[var(--text-muted)]">
                        {event.createdAt.toLocaleDateString("zh-TW", {
                          timeZone: "Asia/Taipei",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-3 pl-1 py-1">
                    {/* Dot */}
                    <div
                      className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 z-10 ${getEventDotColor(event.eventType)}`}
                    />

                    {/* Content */}
                    <div className={`flex-1 rounded-lg px-3 py-2 ${
                      ["STORE_CALL", "STORE_NAV", "STORE_LINE"].includes(event.eventType)
                        ? "bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20"
                        : event.eventType === "FOLLOW"
                          ? "bg-emerald-50 border border-emerald-200"
                          : "bg-[var(--bg-secondary)]/50"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--text-primary)]">
                          {EVENT_NAMES[event.eventType] ?? event.eventType}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {event.createdAt.toLocaleTimeString("zh-TW", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Event details */}
                      {eventData.keyword && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          訊息：「{String(eventData.keyword).slice(0, 40)}」
                        </p>
                      )}
                      {eventData.regionName && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">地區：{eventData.regionName}</p>
                      )}
                      {eventData.storeName && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">門市：{eventData.storeName}</p>
                      )}
                      {eventData.category && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          產品：{eventData.category}
                          {eventData.series ? ` / ${eventData.series}` : ""}
                        </p>
                      )}
                      {eventData.postbackAction && (
                        <p className="text-xs text-blue-600 mt-0.5">→ {eventData.postbackAction}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Upcoming Scheduled Messages ── */}
      {scheduledMessages.filter((m) => m.status === "pending").length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-bold text-[var(--text-secondary)] mb-3">📅 待發送序列訊息</h2>
          <div className="space-y-2">
            {scheduledMessages
              .filter((m) => m.status === "pending")
              .map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center justify-between bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-xs"
                >
                  <span className="text-[var(--text-secondary)]">
                    {msg.sequenceId.replace("hardcode_", "")} / {msg.stepId}
                  </span>
                  <span className="text-[var(--text-muted)]">
                    預計 {new Date(msg.scheduledAt).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}
                    {" "}
                    {new Date(msg.scheduledAt).toLocaleTimeString("zh-TW", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
