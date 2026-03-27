import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STOP_WORDS = new Set([
  // 代名詞
  "的", "了", "是", "我", "你", "他", "她", "它", "我們", "你們", "他們",
  "這", "那", "有", "在", "和", "與", "或", "但", "也", "都", "還",
  "就", "很", "不", "沒", "要", "會", "可以", "什麼", "怎麼", "為什麼",
  // 語助詞
  "嗎", "嗯", "哦", "啊", "喔", "呢", "吧", "嗨", "哈", "OK", "ok",
  "ㄟ", "欸", "哇", "唷", "囉", "ㄚ", "ㄛ", "ㄜ",
  // 常見無意義動詞/副詞
  "想", "請", "問", "看", "找", "去", "來", "跟", "給", "讓", "做", "到",
  "對", "把", "被", "比", "從", "向", "用", "以", "能", "得", "著",
  "想要", "請問", "一下", "可以", "怎麼", "如何", "哪裡",
  "你好", "您好", "謝謝", "感謝", "麻煩", "不好意思", "抱歉",
  "知道", "需要", "應該", "已經", "然後", "所以", "因為", "如果",
  "這個", "那個", "一個", "什麼時候", "多少", "幾",
  // 英文常見
  "hi", "hello", "hey", "yes", "no", "the", "is", "are",
]);

/** Keywords that should be extracted from user messages (domain-specific) */
const KEYWORD_DICT = [
  // 產品相關
  "馬桶", "智慧馬桶", "免治", "免治馬桶", "馬桶座", "馬桶蓋",
  "面盆", "浴櫃", "洗手台", "洗臉盆",
  "龍頭", "水龍頭", "蓮蓬頭", "花灑",
  "浴缸", "泡澡",
  "配件", "毛巾架", "置物架", "鏡子", "鏡櫃",
  "小便斗",
  // 服務相關
  "維修", "修理", "漏水", "故障", "壞了", "損壞", "不出水", "零件",
  "安裝", "施工", "拆除", "換新",
  // 購買意圖
  "價格", "報價", "多少錢", "費用", "價位", "優惠", "折扣", "特價", "促銷",
  "購買", "訂購", "下單", "買",
  // 門市相關
  "門市", "店面", "展示", "展間", "旗艦店",
  "地址", "地點", "位置", "在哪", "哪裡",
  "營業", "營業時間", "幾點", "開門",
  "預約", "參觀", "體驗",
  // 品牌
  "DEREK", "德瑞克",
  // 功能需求
  "省水", "節水", "沖水", "清潔", "除臭", "暖座", "烘乾",
  "無障礙", "安全",
  "保固", "保養", "售後",
];

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
  "Status:High_Purchase_Intent": "高購買意圖",
  "Status:Needs_Human": "需人工",
  "Role:Service_Needed": "維修需求",
};

export default async function KeywordsPage() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [fallbackEvents, messageEvents] = await Promise.all([
    prisma.userEvent.findMany({
      where: { eventType: "FALLBACK", createdAt: { gte: since } },
      select: { data: true, userId: true },
      take: 2000,
    }),
    prisma.userEvent.findMany({
      where: { eventType: "MESSAGE", createdAt: { gte: since } },
      select: { data: true, userId: true },
      take: 2000,
    }),
  ]);

  // ── Keyword frequency (extract keywords from sentences) ──
  const freq: Record<string, { count: number; userIds: Set<string> }> = {};

  function addWord(word: string, userId: string) {
    if (!word || word.length < 2 || STOP_WORDS.has(word)) return;
    if (!freq[word]) freq[word] = { count: 0, userIds: new Set() };
    freq[word].count++;
    freq[word].userIds.add(userId);
  }

  /** Extract meaningful keywords from a raw message */
  function extractKeywords(raw: unknown, userId: string) {
    if (typeof raw !== "string" || !raw.trim()) return;
    const text = raw.trim().replace(/[！!？?。，、,\.…~～\s]+/g, " ").trim();
    if (!text) return;

    // Filter out pure numbers, single chars, test strings
    if (/^[\d\s\.\-]+$/.test(text)) return;  // "1 2 3", "123"
    if (text.length <= 1) return;

    // 1. Try to match known dictionary keywords first
    const matched = new Set<string>();
    for (const kw of KEYWORD_DICT) {
      if (text.includes(kw)) {
        matched.add(kw);
      }
    }

    // 2. If dictionary matched keywords, use those
    if (matched.size > 0) {
      for (const kw of matched) addWord(kw, userId);
      return;
    }

    // 3. Fallback: split Chinese text into 2-3 char n-grams, filter by stop words
    // Only keep short text (< 6 chars) as-is if it's not a sentence
    if (text.length <= 5 && !STOP_WORDS.has(text)) {
      addWord(text, userId);
      return;
    }

    // For longer text, try splitting by common delimiters and punctuation
    const segments = text.split(/[\s,，。、！!？?；;：:]+/).filter(Boolean);
    for (const seg of segments) {
      const clean = seg.replace(/^[我你他她它們的了是]+/, "").trim();
      if (clean.length >= 2 && clean.length <= 8 && !STOP_WORDS.has(clean)) {
        addWord(clean, userId);
      }
    }
  }

  for (const e of fallbackEvents) extractKeywords((e.data as Record<string, unknown>)?.keyword, e.userId);
  for (const e of messageEvents)  extractKeywords((e.data as Record<string, unknown>)?.keyword, e.userId);

  const sorted = Object.entries(freq)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 60)
    .map(([word, { count, userIds }]) => ({ word, count, uniqueUsers: userIds.size }));

  // ── Co-occurrence tags for top 8 keywords ──
  const top8 = sorted.slice(0, 8);
  const coTagData: { word: string; tags: { tag: string; count: number }[] }[] = [];

  for (const { word } of top8) {
    const entry = freq[word];
    if (!entry || entry.userIds.size === 0) continue;

    const profiles = await prisma.userProfile.findMany({
      where: { userId: { in: [...entry.userIds] } },
      select: { tags: true },
    });

    const tagCounts: Record<string, number> = {};
    for (const p of profiles) {
      for (const tag of p.tags) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
    }

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    if (topTags.length > 0) coTagData.push({ word, tags: topTags });
  }

  // Unmatched count
  const unmatchedTotal = fallbackEvents.length;
  const uniqueUnmatched = new Set(fallbackEvents.map((e) => e.userId)).size;

  const maxCount = sorted[0]?.count ?? 1;

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold text-gray-100 mb-1">☁️ 意圖關鍵詞雲</h1>
      <p className="text-xs text-gray-500 mb-6">
        過去 30 天用戶輸入但機器人未能回應的訊息 ·
        共 {unmatchedTotal} 筆 · {uniqueUnmatched} 位不重複用戶
      </p>

      {sorted.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500">過去 30 天內無未匹配訊息</p>
        </div>
      ) : (
        <>
          {/* ── Word Cloud SVG ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-xs font-bold text-gray-400 mb-4">詞頻視覺化（字體越大 = 出現越多次）</h2>
            <WordCloud words={sorted.slice(0, 40)} maxCount={maxCount} />
          </div>

          {/* ── Top keywords table ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
            <h2 className="text-xs font-bold text-gray-400 mb-3">📊 關鍵詞排行（前 20）</h2>
            <div className="space-y-1.5">
              {sorted.slice(0, 20).map(({ word, count, uniqueUsers }, i) => {
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div key={word} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-5 text-right">{i + 1}</span>
                    <span className="text-sm text-gray-200 w-32 truncate font-medium">{word}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-amber-600 h-2 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-amber-400 w-10 text-right font-mono">{count}</span>
                    <span className="text-xs text-gray-600 w-16 text-right">{uniqueUsers} 人</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Co-occurrence matrix ── */}
          {coTagData.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
              <h2 className="text-xs font-bold text-gray-400 mb-1">🔗 關鍵詞 × 客戶標籤關聯</h2>
              <p className="text-xs text-gray-600 mb-4">輸入這些詞的用戶，同時擁有哪些意圖/地區標籤</p>
              <div className="space-y-4">
                {coTagData.map(({ word, tags }) => (
                  <div key={word}>
                    <p className="text-sm font-bold text-amber-400 mb-1.5">「{word}」</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(({ tag, count }) => (
                        <div
                          key={tag}
                          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${
                            tag.startsWith("Intent:") ? "bg-blue-900/40 text-blue-300"
                            : tag.startsWith("Region:") ? "bg-green-900/40 text-green-300"
                            : tag.startsWith("Status:") ? "bg-red-900/40 text-red-300"
                            : tag.startsWith("Role:")   ? "bg-yellow-900/40 text-yellow-300"
                            : "bg-gray-700 text-gray-300"
                          }`}
                        >
                          <span>{TAG_ZH[tag] ?? tag}</span>
                          <span className="opacity-60">×{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Actionable insights ── */}
          <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-4">
            <h2 className="text-xs font-bold text-amber-400 mb-2">💡 可行動洞察</h2>
            <ul className="space-y-1.5 text-sm text-amber-100">
              {sorted[0] && (
                <li>「{sorted[0].word}」出現 {sorted[0].count} 次，是最常見的未匹配詞 — 考慮新增此關鍵字的自動回覆。</li>
              )}
              {sorted[1] && (
                <li>「{sorted[1].word}」和「{sorted[0]?.word ?? ""}」合計佔前 20 名的 {Math.round(((sorted[0]?.count ?? 0) + sorted[1].count) / sorted.reduce((s, w) => s + w.count, 0) * 100)}%。</li>
              )}
              <li>共 {uniqueUnmatched} 位用戶遇到無回應 — 建議優先為前 5 名關鍵字建立回覆規則。</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// ── Word Cloud SVG (server-side, deterministic layout) ──
function WordCloud({
  words,
  maxCount,
}: {
  words: { word: string; count: number }[];
  maxCount: number;
}) {
  const W = 680, H = 240;
  const MIN_SIZE = 11, MAX_SIZE = 38;

  // Pre-compute font size
  const sized = words.map((w) => ({
    ...w,
    size: MIN_SIZE + Math.round(((w.count / maxCount) ** 0.6) * (MAX_SIZE - MIN_SIZE)),
  }));

  // Simple row-based layout: place words left-to-right, wrap to next row
  const rows: typeof sized[number][][] = [];
  let currentRow: typeof sized[number][] = [];
  let rowWidth = 0;
  const PAD = 12;

  for (const w of sized) {
    const estWidth = w.word.length * w.size * 0.65 + PAD;
    if (rowWidth + estWidth > W - 20 && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [];
      rowWidth = 0;
    }
    currentRow.push(w);
    rowWidth += estWidth;
  }
  if (currentRow.length > 0) rows.push(currentRow);

  // Assign colors by rank
  const COLORS = ["#B89A6A", "#F59E0B", "#60A5FA", "#34D399", "#F87171", "#A78BFA", "#FB923C"];

  const elements: { x: number; y: number; size: number; word: string; color: string; count: number }[] = [];
  let y = 28;
  let colorIdx = 0;

  for (const row of rows) {
    if (y > H - 10) break;
    // Total width of row
    const totalW = row.reduce((s, w) => s + w.word.length * w.size * 0.65 + PAD, 0);
    const startX = Math.max(8, (W - totalW) / 2);
    let x = startX;

    for (const w of row) {
      const ww = w.word.length * w.size * 0.65 + PAD;
      elements.push({ x, y, size: w.size, word: w.word, color: COLORS[colorIdx % COLORS.length], count: w.count });
      x += ww;
      colorIdx++;
    }
    y += Math.max(...row.map((w) => w.size)) + 10;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
      {elements.map((el, i) => (
        <text
          key={i}
          x={el.x}
          y={el.y}
          fontSize={el.size}
          fill={el.color}
          fillOpacity="0.9"
          fontWeight={el.size > 24 ? "bold" : "normal"}
        >
          {el.word}
        </text>
      ))}
    </svg>
  );
}
