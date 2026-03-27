---
name: derek-line-cms-patterns
description: DEREK 德瑞克衛浴 LINE Bot + CMS 全棧 Next.js 開發模式
version: 1.0.0
source: local-codebase-analysis
analyzed_files: 54
---

# DEREK LINE CMS — 開發模式與慣例

## Tech Stack

- **Framework**: Next.js 16.2.1 (App Router, Server Components, Server Actions)
- **Language**: TypeScript 5.x (strict)
- **ORM**: Prisma 6.x + PostgreSQL
- **Auth**: NextAuth v5 (beta) + Google OAuth + JWT strategy
- **LINE SDK**: @line/bot-sdk v10.x (Messaging API, Flex Messages)
- **Storage**: Cloudflare R2 via @aws-sdk/client-s3
- **Styling**: Tailwind CSS v4 (dark theme: bg-gray-950/900/800, accent: amber-500/600)
- **Testing**: Vitest + @vitest/coverage-v8
- **Deployment**: Docker Compose on VPS (Ubuntu)

## Project Architecture

```
derek-line-cms/
├── app/
│   ├── (auth)/login/           # 登入頁（Google OAuth）
│   ├── (dashboard)/            # CMS 後台（auth-protected layout）
│   │   ├── layout.tsx          # Sidebar + auth guard
│   │   ├── stores/             # 門市管理 CRUD
│   │   ├── regions/            # 地區管理 CRUD
│   │   ├── replies/            # 自動回覆管理
│   │   ├── settings/           # 系統設定
│   │   ├── analytics/          # 互動分析 + 據點表現
│   │   ├── leads/              # 潛在客戶管理
│   │   └── alerts/             # 通知中心 + 閾值設定
│   ├── api/
│   │   ├── auth/[...nextauth]/ # NextAuth route
│   │   ├── v1/                 # RESTful API (stores, regions, replies, settings, upload)
│   │   └── webhook/line/       # LINE Webhook handler
│   └── layout.tsx              # Root layout
├── components/
│   ├── ui/                     # 共用 UI (NavLink, ImageUpload)
│   ├── stores/                 # StoreForm, StoreToggle
│   ├── regions/                # RegionForm
│   ├── replies/                # ReplyForm
│   ├── settings/               # SettingsForm
│   └── analytics/              # Charts (client component)
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── auth.ts                 # NextAuth config
│   ├── line.ts                 # LINE client + signature verify
│   ├── reply.ts                # Auto-reply matching logic
│   ├── tracking.ts             # Intent tracking + lead scoring
│   ├── alerts.ts               # Alert rule engine + LINE push
│   ├── settings.ts             # SiteSetting cache (60s TTL)
│   ├── r2.ts                   # Cloudflare R2 S3 client
│   └── flex/                   # LINE Flex Message builders
│       ├── regionMenu.ts       # 地區選單
│       ├── storeCard.ts        # 門市卡片 carousel
│       └── productMenu.ts      # 產品分類選單
├── prisma/
│   ├── schema.prisma           # 10 models (Region, Store, User, UserEvent, UserProfile, AlertRule, AlertLog, etc.)
│   └── seed.ts                 # 初始資料（6 地區、10 門市、6 回覆、1 管理員）
├── __tests__/                  # Vitest tests
└── scripts/
    └── setup-richmenu.ts       # Rich Menu 設定腳本
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

### 2. Form Pattern — Client Component + API Route

表單用 **Client Component**，提交到 **API Route**。

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
  // ...
}
```

**規則**:
- Client Component 開頭 `"use client"`
- 使用 `useRouter` 導向
- loading 狀態防重複提交
- 新增用 POST，編輯用 PUT

### 3. Server Actions Pattern — Simple Forms

簡單操作（toggle、刪除、設定）用 **Server Actions**。

```typescript
// app/(dashboard)/alerts/settings/page.tsx
async function toggleRule(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const current = formData.get("isActive") === "true";
  await prisma.alertRule.update({
    where: { id },
    data: { isActive: !current },
  });
  revalidatePath("/alerts/settings");
}
```

**規則**:
- 內聯 `"use server"` 在 async function 開頭
- 使用 `FormData` 接收表單資料
- 操作完呼叫 `revalidatePath()` 刷新頁面

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
  await Promise.all(events.map((event, index) => handleEvent(event, index)));
  return NextResponse.json({ ok: true });
}
```

**規則**:
- 用 `req.text()` 取 raw body（不能用 `req.json()`，否則簽名驗證會失敗）
- 簽名驗證失敗回 403
- `handleEvent` 處理 follow/unfollow/message/postback
- 未知 event type 靜默忽略
- 錯誤不 throw — webhook 必須回 200

### 6. Intent Tracking Pattern

```typescript
// lib/tracking.ts
export async function trackEvent(
  userId: string,
  eventType: string,
  data: TrackingData,
  webhookEventId?: string
): Promise<void> {
  try {
    // 1. Write UserEvent
    // 2. Count fallbacks if needed
    // 3. Get existing profile
    // 4. Fetch LINE display name if unknown
    // 5. Apply tag rules
    // 6. Calculate lead score (HOT/WARM/COLD)
    // 7. Upsert UserProfile
    // 8. Check alert rules (non-blocking)
  } catch (error) {
    console.error("[tracking] Event recording failed:", error);
    // NEVER throw — event failure must not break LINE reply
  }
}
```

**規則**:
- 全部包在 try-catch，錯誤只 log 不 throw
- 標籤系統：`Intent:*`, `Region:*`, `Status:*`, `Role:*`
- Lead Score: HOT（30天衰減）→ WARM → COLD
- `webhookEventId` 做 dedup（unique constraint）

### 7. Alert System Pattern

```typescript
// lib/alerts.ts
export async function checkAlerts(ctx, prevLeadScore, newLeadScore, fallbackCount) {
  // 1. Get active rules
  // 2. Map tracking event → alert event types
  // 3. Check STORE_REPEAT with time window
  // 4. Process matching rules → log + LINE push
}
```

**規則**:
- 4 種 alert event: LEAD_HOT, FALLBACK_3X, STORE_REPEAT, NEW_FOLLOW
- 每個 rule 有 threshold + windowMin + notifyLine 開關
- Admin LINE IDs 存在 SiteSetting `alert_line_user_ids`
- AlertLog 記錄所有觸發，含 lineNotified 狀態
- 非阻塞 — 失敗不影響 webhook 回覆

### 8. Flex Message Pattern

```typescript
// lib/flex/regionMenu.ts
export async function buildRegionMenu(): Promise<FlexContainer> {
  const regions = await prisma.region.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });
  return {
    type: "bubble",
    body: { /* Flex JSON structure */ },
    // 使用 postback action，data 格式: region=SLUG
  };
}
```

**規則**:
- 所有 Flex Message 從 DB 動態讀取
- Postback data 格式: `key=value`（如 `region=taipei`, `store_action=call&id=xxx`）
- 門市卡片用不同底色區分類型（FLAGSHIP=#1a1a1a, BRANCH=#2B4C7E, etc.）
- 產品選單有父選單（大分類）和子回覆（子分類清單）

## Design System

### Dark Theme
- **Background**: `bg-gray-950` (main), `bg-gray-900` (cards), `bg-gray-800` (inputs/hover)
- **Borders**: `border-gray-800` (default), `border-gray-700` (inputs)
- **Text**: `text-gray-100` (headings), `text-gray-200` (body), `text-gray-400/500` (secondary)
- **Accent**: `amber-500/600` (#B89A6A brand gold)
- **Status**: green for active/HOT, amber for warm/warning, red for inactive/COLD

### Component Conventions
- Cards: `bg-gray-900 rounded-xl border border-gray-800 p-4`
- Buttons (primary): `bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-4 py-2`
- Buttons (secondary): `bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg`
- Inputs: `bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200`
- Tags/Badges: `text-xs px-2 py-0.5 rounded-full`
- Page titles: `text-xl font-bold text-gray-100 mb-6`

### Sidebar Navigation
- Width: `w-56`
- Brand: amber-500 DEREK text + gray-500 subtitle
- Links: NavLink component with active state highlighting
- Emoji prefixes for visual scanning: 🏪 📍 💬 ⚙️ 📊 🎯 🔔 🏆

## Database Conventions

- IDs: `@id @default(cuid())` (CUID format)
- Timestamps: `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`
- Boolean fields: `isActive`, `isBlocked`, `isRead`, `notifyLine`
- Arrays: PostgreSQL `String[]` for tags, counties
- Enums: `StoreType`, `Role` (PascalCase values)
- Indexes on: userId, eventType, createdAt, leadScore, isRead

## i18n Conventions

- **全介面中文**：所有 CMS UI、LINE 訊息、通知、標籤顯示均為繁體中文
- **Tag 系統**：DB 存英文 key（`Intent:Comfort_High`），顯示時用 mapping 轉中文
- **程式碼**：變數名/函式名用英文，註解中英混合

## Deployment Pattern

- **Local Dev**: `pnpm dev` + Docker PostgreSQL (port 8855)
- **Production**: VPS + Docker Compose (`docker compose up -d --build`)
- **File Sync**: Python paramiko base64 chunked upload（VPS 不支援 SCP）
- **DB Migrations**: Prisma 7 相容問題 → 用 raw SQL 直接在 psql 建表
- **環境變數**: `.env` 文件，包含 LINE credentials, DB URL, NextAuth secret, R2 keys, Google OAuth

## Error Handling

- **Webhook**: 永遠回 200，錯誤 log 不 throw
- **Tracking**: try-catch 包裹，失敗不影響 LINE reply
- **Alerts**: 非阻塞，失敗只 console.error
- **API Routes**: 適當 HTTP status codes (401, 403, 404, 500)
- **Forms**: loading state + error state 在 client component 處理

## Testing

- **Framework**: Vitest
- **Pattern**: `__tests__/*.test.ts`
- **Coverage**: `@vitest/coverage-v8`
- **Mock**: canvas package for Flex Message pixel measurements
- **Run**: `pnpm test` / `pnpm test:watch`
