import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const RULE_TYPES: Record<string, string> = {
  LEAD_HOT: "用戶升級為熱線索 (HOT)",
  FALLBACK_3X: "24h 內查無關鍵字 3 次以上",
  STORE_REPEAT: "短時間內反覆查詢同門市",
  NEW_FOLLOW: "新加好友",
};

export default async function AlertSettingsPage() {
  const rules = await prisma.alertRule.findMany({
    orderBy: { createdAt: "asc" },
  });

  // Get admin LINE IDs setting
  const setting = await prisma.siteSetting.findUnique({
    where: { key: "alert_line_user_ids" },
  });

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

  async function updateThreshold(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const threshold = parseInt(formData.get("threshold") as string) || 1;
    const windowMin = parseInt(formData.get("windowMin") as string) || 0;
    const notifyLine = formData.get("notifyLine") === "on";
    await prisma.alertRule.update({
      where: { id },
      data: { threshold, windowMin, notifyLine },
    });
    revalidatePath("/alerts/settings");
  }

  async function saveAdminIds(formData: FormData) {
    "use server";
    const ids = (formData.get("adminIds") as string) || "";
    await prisma.siteSetting.upsert({
      where: { key: "alert_line_user_ids" },
      create: {
        key: "alert_line_user_ids",
        value: ids,
        label: "通知管理員 LINE User IDs",
      },
      update: { value: ids },
    });
    revalidatePath("/alerts/settings");
  }

  async function seedDefaultRules() {
    "use server";
    const defaults = [
      {
        name: "🔥 用戶升級為熱線索",
        eventType: "LEAD_HOT",
        threshold: 1,
        windowMin: 0,
        notifyLine: true,
      },
      {
        name: "⚠️ 用戶多次查無關鍵字",
        eventType: "FALLBACK_3X",
        threshold: 3,
        windowMin: 1440,
        notifyLine: true,
      },
      {
        name: "🔄 反覆查詢同門市",
        eventType: "STORE_REPEAT",
        threshold: 2,
        windowMin: 5,
        notifyLine: true,
      },
      {
        name: "👋 新加好友",
        eventType: "NEW_FOLLOW",
        threshold: 1,
        windowMin: 0,
        notifyLine: false,
      },
    ];

    for (const rule of defaults) {
      const exists = await prisma.alertRule.findFirst({
        where: { eventType: rule.eventType },
      });
      if (!exists) {
        await prisma.alertRule.create({ data: rule });
      }
    }
    revalidatePath("/alerts/settings");
    redirect("/alerts/settings");
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-6">⚙️ 閾值設定</h1>

      {/* Admin LINE IDs */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4 mb-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-2">
          📩 通知接收者（管理員 LINE User ID）
        </h2>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          多個 ID 用逗號分隔。可從 LINE OA 管理後台查看。
        </p>
        <form action={saveAdminIds} className="flex gap-2">
          <input
            name="adminIds"
            type="text"
            defaultValue={setting?.value ?? ""}
            placeholder="U1234...,U5678..."
            className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
          />
          <button
            type="submit"
            className="bg-[var(--brand-primary)] hover:bg-[var(--text-secondary)] text-white text-sm px-4 py-2 rounded-lg"
          >
            儲存
          </button>
        </form>
      </div>

      {/* Alert Rules */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">📋 通知規則</h2>
          {rules.length === 0 && (
            <form action={seedDefaultRules}>
              <button
                type="submit"
                className="text-sm bg-[var(--brand-primary)] hover:bg-[var(--text-secondary)] text-white px-3 py-1.5 rounded-lg"
              >
                建立預設規則
              </button>
            </form>
          )}
        </div>

        {rules.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            尚無規則，點擊「建立預設規則」初始化 4 條預設通知。
          </p>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`border rounded-lg p-4 ${
                  rule.isActive
                    ? "border-[var(--border-strong)] bg-[var(--bg-tertiary)]/50"
                    : "border-[var(--border-strong)] bg-[var(--bg-secondary)]/50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {rule.name}
                    </span>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {RULE_TYPES[rule.eventType] ?? rule.eventType}
                    </p>
                  </div>
                  <form action={toggleRule}>
                    <input type="hidden" name="id" value={rule.id} />
                    <input
                      type="hidden"
                      name="isActive"
                      value={String(rule.isActive)}
                    />
                    <button
                      type="submit"
                      className={`text-xs px-3 py-1 rounded-full ${
                        rule.isActive
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                      }`}
                    >
                      {rule.isActive ? "啟用中" : "已停用"}
                    </button>
                  </form>
                </div>

                <form
                  action={updateThreshold}
                  className="flex flex-wrap gap-3 items-end"
                >
                  <input type="hidden" name="id" value={rule.id} />

                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">
                      觸發次數
                    </label>
                    <input
                      name="threshold"
                      type="number"
                      min={1}
                      defaultValue={rule.threshold}
                      className="w-20 bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded px-2 py-1 text-sm text-[var(--text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[var(--text-muted)] block mb-1">
                      時間窗口 (分鐘)
                    </label>
                    <input
                      name="windowMin"
                      type="number"
                      min={0}
                      defaultValue={rule.windowMin}
                      className="w-20 bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded px-2 py-1 text-sm text-[var(--text-primary)]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      name="notifyLine"
                      type="checkbox"
                      defaultChecked={rule.notifyLine}
                      className="w-4 h-4 rounded"
                    />
                    <label className="text-xs text-[var(--text-secondary)]">LINE 推播</label>
                  </div>

                  <button
                    type="submit"
                    className="text-xs bg-[var(--border-strong)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-3 py-1.5 rounded"
                  >
                    更新
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
