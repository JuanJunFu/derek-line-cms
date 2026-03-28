---
name: derek-line-cms-patterns
description: DEREK 德瑞克衛浴 LINE Bot + CMS 全棧 Next.js 開發模式
version: 2.0.0
source: local-git-analysis
analyzed_commits: 32
---

# DEREK LINE CMS — 開發模式與慣例

## Tech Stack

- **Framework**: Next.js 16.2.1 (App Router, Server Components, Server Actions)
- **Language**: TypeScript 5.x (strict)
- **ORM**: Prisma 6.x + PostgreSQL
- **Auth**: NextAuth v5 (beta) + Google OAuth + JWT strategy
- **LINE SDK**: @line/bot-sdk v10.x (Messaging API, Flex Messages, Rich Menus)
- **Storage**: Cloudflare R2 via @aws-sdk/client-s3
- **Styling**: Tailwind CSS v4 with CSS variable theming (3 themes: modern/gold/minimal)
- **Testing**: Vitest + @vitest/coverage-v8
- **Deployment**: Docker Compose on VPS (Ubuntu) + Vercel (alternative)

## Project Architecture

```
derek-line-cms/
├── app/
│   ├── (auth)/login/               # 登入頁（Google OAuth）
│   ├── (dashboard)/                # CMS 後台（auth-protected layout）
│   │   ├── layout.tsx              # Sidebar + auth guard + theme
│   │   ├── page.tsx                # 首頁儀表板（今日概覽）
│   │   ├── stores/                 # 門市管理 CRUD
│   │   ├── regions/                # 地區管理 CRUD
│   │   ├── replies/                # 自動回覆管理
│   │   ├── products/               # 產品目錄管理
│   │   ├── settings/               # 系統設定（DB-backed SiteSetting）
│   │   ├── analytics/              # 互動分析 + 據點表現 + 關鍵字詞雲
│   │   ├── leads/                  # 潛在客戶管理（分頁、篩選、詳情）
│   │   ├── leads/[userId]/         # 客戶詳情（時間軸、對話、備註）
│   │   ├── alerts/                 # 通知中心 + 閾值設定
│   │   ├── broadcasts/             # 群發推播管理
│   │   ├── segments/               # 受眾分群管理
│   │   ├── tags/                   # 標籤管理
│   │   ├── rich-menus/             # 圖文選單管理（建立、部署、配對）
│   │   ├── sequences/              # 自動化序列管理
│   │   ├── sequences/editor/       # 序列步驟編輯器
│   │   ├── referrals/              # 推薦碼追蹤
│   │   ├── users/                  # 管理員帳號管理
│   │   ├── graph/                  # 客戶關係圖（d3-force）
│   │   └── war-room/              # 意圖戰情室（即時監控）
│   ├── api/
│   │   ├── auth/[...nextauth]/     # NextAuth route
│   │   ├── cron/sequence/          # Vercel Cron 序列觸發
│   │   ├── v1/                     # RESTful API（20+ route files）
│   │   └── webhook/line/           # LINE Webhook handler
│   └── layout.tsx                  # Root layout + font + globals
├── components/
│   ├── ui/                         # 共用 UI (NavLink, SidebarNav, ImageUpload, Pagination, ThemeSwitcher, MobileSidebar, AutoRefresh)
│   ├── analytics/                  # Charts (recharts client component)
│   ├── broadcasts/                 # BroadcastClient
│   ├── leads/                      # LeadsClient, LeadsFilter, ChatLog, UserNotes, CustomerTypeToggle, UserDetailTabs
│   ├── products/                   # ProductForm, ProductToggle
│   ├── regions/                    # RegionForm
│   ├── replies/                    # ReplyForm
│   ├── rich-menus/                 # RichMenuClient (presets, deploy, pair)
│   ├── segments/                   # SegmentClient
│   ├── sequences/                  # SequenceTable, SequenceEditorClient, FlexTemplateSettings
│   ├── settings/                   # SettingsForm
│   ├── stores/                     # StoreForm, StoreToggle
│   ├── tags/                       # TagsClient
│   └── users/                      # UsersClient
├── lib/
│   ├── prisma.ts                   # Prisma client singleton
│   ├── auth.ts                     # NextAuth config
│   ├── line.ts                     # LINE client + signature verify
│   ├── reply.ts                    # Auto-reply matching logic
│   ├── tracking.ts                 # Intent tracking + dual-score system
│   ├── alerts.ts                   # Alert rule engine + LINE push
│   ├── settings.ts                 # SiteSetting cache (60s TTL)
│   ├── r2.ts                       # Cloudflare R2 S3 client
│   ├── constants.ts                # HOT_DECAY_DAYS, REPAIR_KEYWORDS, REFERRAL_KEYWORDS
│   ├── lead-utils.ts               # Lead score helpers
│   ├── broadcast.ts                # Broadcast send logic
│   ├── chatlog.ts                  # Chat log persistence
│   ├── referral.ts                 # Referral code + LINE share Flex
│   ├── segment.ts                  # Segment evaluation
│   ├── sequence.ts                 # Sequence engine (new customer / repair flows)
│   └── flex/                       # LINE Flex Message builders
│       ├── regionMenu.ts           # 地區選單 Flex
│       ├── storeCard.ts            # 門市卡片 carousel
│       └── productMenu.ts          # 產品分類選單 (DB-backed)
├── prisma/
│   ├── schema.prisma               # 15+ models
│   ├── seed.ts                     # 初始資料
│   └── seed-new-settings.ts        # 設定種子資料
├── __tests__/                      # Vitest tests
├── scripts/
│   ├── setup-richmenu.ts           # 舊版 Rich Menu 設定（4格）
│   ├── deploy-richmenu-pair.ts     # 配對 Rich Menu 部署（新客+熟客切換）
│   ├── generate-richmenu-images.ts # Canvas 產生選單圖片
│   └── seed-sequences.ts           # 序列種子資料
└── deploy.sh                       # VPS 部署腳本
```

## Key Patterns

### 1. CMS Page Pattern — Server Components + Direct Prisma

CMS 頁面使用 **Server Components** 直接查詢 Prisma，不經 API routes。

```typescript
// app/(dashboard)/stores/page.tsx
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const stores = await prisma.store.findMany({
    include: { region: true },
    orderBy: { order: "asc" },
  });
  return ( /* render stores */ );
}
```

**規則**:
- 所有 dashboard 頁面加 `export const dynamic = "force-dynamic"`
- 使用 `import { prisma } from "@/lib/prisma"` 直接查詢
- 表格頁面在 Server Component 裡直接 findMany
- 編輯頁面用 `[id]/page.tsx`，id="new" 表示新增
- 頁面標題使用 emoji prefix + 中文標題 + 說明文字

### 2. Client Component Pattern — Form + API Route

複雜互動用 **Client Component**，提交到 **API Route**。

```typescript
// components/stores/StoreForm.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function StoreForm({ store, regions }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(
      store ? `/api/v1/stores/${store.id}` : "/api/v1/stores",
      { method: store ? "PUT" : "POST", body: JSON.stringify(data) }
    );
    if (res.ok) router.push("/stores");
  }
}
```

**規則**:
- Client Component 開頭 `"use client"`
- 使用 `useRouter` 導向
- loading 狀態防重複提交
- 新增用 POST，編輯用 PUT
- 資料刷新模式：成功後 `router.refresh()` + 重新 fetch 列表

### 3. Full-Page Client Pattern — Complex List + CRUD

列表頁面如 leads、tags、segments、broadcasts、rich-menus 使用完整 Client Component。

```typescript
// Server page (minimal): fetch data, pass to client
export default async function TagsPage() {
  const tags = await prisma...;
  return <TagsClient initialTags={tags as any} />;
}

// Client component (rich): search, filter, CRUD, refresh
export function TagsClient({ initialTags }: { initialTags: TagInfo[] }) {
  const [tags, setTags] = useState(initialTags);
  const refreshTags = useCallback(async () => {
    const res = await fetch("/api/v1/tags");
    if (res.ok) { const data = await res.json(); setTags(data.tags); }
  }, []);
  // ...
}
```

**規則**:
- Server page 只做初始 fetch，傳 `as any` 給 client
- Client component 用 `useState(initialData)` 初始化
- 提供 `refresh*()` callback 做 client-side 資料刷新
- 複雜篩選/搜尋都在 client-side

### 4. API Route Pattern

```typescript
// app/api/v1/stores/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const stores = await prisma.store.findMany({ include: { region: true } });
  return NextResponse.json(stores);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const store = await prisma.store.create({ data: body });
  return NextResponse.json(store, { status: 201 });
}
```

**規則**:
- GET 可以公開（LINE Bot 也會用）
- POST/PUT/DELETE 必須 `await auth()` 驗證
- 回傳 `NextResponse.json()`
- Dynamic route params: `{ params }: { params: Promise<{ id: string }> }` + `await params`

### 5. LINE Webhook Pattern

```typescript
// app/api/webhook/line/route.ts
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature");
  if (!signature || !verifyLineSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }
  const { events } = JSON.parse(body);
  await Promise.all(events.map(handleEvent));
  return NextResponse.json({ ok: true });
}
```

**規則**:
- 用 `req.text()` 取 raw body（不能用 `req.json()`，否則簽名驗證會失敗）
- 簽名驗證失敗回 403
- `handleEvent` 處理 follow/unfollow/message/postback
- 錯誤不 throw — webhook 必須回 200
- 關鍵字觸發: 門市→region menu, 產品→product menu, 推薦→referral Flex, 維修關鍵字→repair sequence
- 對話紀錄: text/postback events 存入 ChatMessage table

### 6. Dual-Track Scoring System

```typescript
// lib/tracking.ts
// 短期意圖分: HOT → WARM → COLD (90天衰減)
// 長期關係分: RelationshipScore 0-100 → 新識/認識/熟識/信任/忠誠

export async function trackEvent(userId, eventType, data, webhookEventId?) {
  // 1. Write UserEvent (dedup by webhookEventId)
  // 2. Apply tag rules (Intent:*, Region:*, Status:*)
  // 3. Calculate lead score (HOT/WARM/COLD)
  // 4. Update RelationshipScore (+5~+30 per event type)
  // 5. Update RelationshipLevel (新識/認識/熟識/信任/忠誠)
  // 6. Detect returning customer (維修關鍵字 → customerType:"returning")
  // 7. Upsert UserProfile
  // 8. Check alert rules (non-blocking)
}
```

**加分規則**:
- PRODUCT_VIEW: +5 (上限20)
- REGION_SELECT: +10
- STORE_CALL/NAV/LINE: +15
- 維修詢問: +25 + 自動設為 returning
- 序列 Postback: +30

### 7. Rich Menu Switching Pattern

支援新客/熟客雙選單切換，使用 LINE Rich Menu Alias。

```typescript
// scripts/deploy-richmenu-pair.ts
// 1. 用 canvas 產生 2500x1686 圖片 (6格 2x3 layout)
// 2. 建立兩個 rich menu on LINE
// 3. 上傳圖片
// 4. 建立別名: richmenu-alias-new / richmenu-alias-vip
// 5. 設新客版為預設

// Area action for switching:
{ type: "richmenuswitch", richMenuAliasId: "richmenu-alias-vip", data: "richmenu-changed-to-vip" }
```

**規則**:
- Rich Menu 存 DB (RichMenu model) + 部署到 LINE
- 配對部署: deploy-pair API 一次部署兩個 + 建立 alias
- Canvas 圖片: banner top (DEREK brand) + 2x3 grid bottom
- CMS 預設模板: 新客版 + 熟客版 presets

### 8. Sequence Engine Pattern

```typescript
// lib/sequence.ts
// 自動化旅程: new_customer (Day0/3/7/30), repair_inquiry
// ScheduledMessage 佇列 → Vercel Cron 每小時觸發
// Flex Message 含 postback buttons → 追蹤互動
```

**規則**:
- 序列定義: Sequence + SequenceStep tables
- 觸發: FOLLOW event (新客序列), 維修關鍵字 (維修序列)
- 排程: ScheduledMessage with dayOffset → scheduledAt
- Cron: `app/api/cron/sequence/route.ts` 每小時檢查 pending messages
- 冪等: atomic status update `pending → processing → sent`

### 9. Broadcast Pattern

```typescript
// lib/broadcast.ts
// 群發推播: 可選受眾 (全部/分群/標籤篩選)
// 支援 text + Flex Message
// 發送記錄追蹤
```

## Design System — CSS Variable Theming

### Theme System (3 themes)
專案使用 CSS 變數實現多主題切換，定義在 `app/globals.css`:

```css
:root {
  --brand-primary: #B89A6A;     /* 品牌主色 */
  --brand-accent: #D4A574;      /* 強調色 */
  --bg-primary: #0a0a0a;        /* 主背景 */
  --bg-secondary: #141414;      /* 卡片背景 */
  --bg-tertiary: #1e1e1e;       /* 輸入框背景 */
  --text-primary: #f5f5f0;      /* 主文字 */
  --text-secondary: #a8a8a0;    /* 次文字 */
  --text-muted: #6b6b60;        /* 輔助文字 */
  --border-strong: #2a2a2a;     /* 強邊框 */
  --border-subtle: #1e1e1e;     /* 弱邊框 */
  --card-bg: #141414;           /* 卡片背景 */
}
```

**規則**:
- **永遠用 CSS 變數**，不用 hardcoded Tailwind 色彩 class
- 例: `bg-[var(--bg-secondary)]` 而非 `bg-gray-900`
- 例: `text-[var(--text-primary)]` 而非 `text-gray-100`
- 例: `border-[var(--border-strong)]` 而非 `border-gray-800`
- 保留語義色: `bg-red-50 text-red-600` (用於 HOT/error), `bg-emerald-50 text-emerald-600` (用於 active/success)
- ThemeSwitcher 元件切換 `.theme-modern` / `.theme-gold` / `.theme-minimal`

### Component Conventions
- Cards: `bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4`
- Buttons (primary): `bg-[var(--brand-primary)] hover:opacity-90 text-white rounded-lg px-4 py-2`
- Inputs: `bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]`
- Tags/Badges: `text-xs px-2 py-0.5 rounded-full`
- Page titles: `text-xl font-bold text-[var(--text-primary)]` + description in `text-sm text-[var(--text-muted)]`

### Sidebar Navigation
- Grouped by category: 📊 數據分析 / 👥 客戶管理 / 📢 行銷工具 / 🔧 系統管理
- SidebarNav component with NavLink active state
- MobileSidebar for responsive (hamburger menu)
- Emoji prefixes for visual scanning

## Database Conventions

### Schema (15+ models)
- **Core**: Region, Store, AutoReply, SiteSetting, Product
- **User**: UserProfile (dual-score), UserEvent (tracking), ChatMessage
- **Marketing**: Broadcast, Segment, RichMenu, Sequence, SequenceStep, ScheduledMessage
- **System**: AlertRule, AlertLog, Note, User (admin), TagDefinition

### Field Conventions
- IDs: `@id @default(cuid())` (CUID format)
- Timestamps: `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`
- Boolean fields: `isActive`, `isBlocked`, `isRead`, `isDefault`, `notifyLine`
- Arrays: PostgreSQL `String[]` for tags, counties
- JSON fields: `areas Json`, `size Json`, `data Json`, `sequenceState Json?`
- Indexes on: userId, eventType, createdAt, leadScore, isRead, [isDefault+env]

### Migration Pattern
- Dev: `npx prisma db push` (schema sync without migration files)
- Prod: `npx prisma db push` via deploy.sh (no migration files needed for single-team project)

## Commit Conventions

專案使用 **conventional commits** (中文說明):
- `feat:` — 新功能 (68% of commits)
- `fix:` — 修復 bug (19%)
- `style:` — UI/CSS 調整 (7%)
- `refactor:` — 重構 (3%)
- `chore:` — 維護/設定 (3%)

**Co-change patterns** (files that change together):
- `lib/tracking.ts` ↔ `app/api/webhook/line/route.ts` — 追蹤邏輯與 webhook 同步
- `prisma/schema.prisma` ↔ `lib/*.ts` — Schema 變更連帶業務邏輯
- `components/*Client.tsx` ↔ `app/api/v1/*/route.ts` — UI 與 API 配對
- `app/(dashboard)/layout.tsx` ↔ `components/ui/SidebarNav.tsx` — 導航結構

## i18n Conventions

- **全介面中文**：所有 CMS UI、LINE 訊息、通知、標籤顯示均為繁體中文
- **Tag 系統**：DB 存英文 key（`Intent:Comfort_High`），顯示時用 mapping 轉中文
- **程式碼**：變數名/函式名用英文，註解中英混合
- **Lead Score**: HOT→高意向, WARM→溫線索, COLD→低活躍
- **Relationship Level**: 新識/認識/熟識/信任/忠誠

## Deployment Pattern

- **Local Dev**: `pnpm dev` + Docker PostgreSQL (port 8855)
- **Production**: VPS Ubuntu + Docker Compose (`docker compose up -d --build`)
- **Deploy Script**: `deploy.sh` — git pull, docker compose build, prisma db push, restart
- **DB**: PostgreSQL in Docker (data volume persisted)
- **環境變數**: `.env` 文件（LINE, DB, NextAuth, R2, Google OAuth）
- **Cron**: Vercel Cron for sequence scheduler (`vercel.json` crons config)

## Error Handling

- **Webhook**: 永遠回 200，錯誤 log 不 throw
- **Tracking**: try-catch 包裹，失敗不影響 LINE reply
- **Alerts**: 非阻塞，失敗只 console.error
- **API Routes**: 適當 HTTP status codes (401, 403, 404, 500)
- **Forms**: loading state + error state 在 client component 處理
- **Sequence Cron**: atomic status update 防重複發送

## Testing

- **Framework**: Vitest
- **Pattern**: `__tests__/*.test.ts`
- **Coverage**: `@vitest/coverage-v8`
- **Run**: `pnpm test` / `pnpm test:watch`
