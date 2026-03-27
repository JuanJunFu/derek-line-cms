import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await prisma.siteSetting.findMany({
    orderBy: { key: "asc" },
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-100 mb-6">系統設定</h1>
      <p className="text-sm text-gray-400 mb-6">
        以下設定會即時反映到 LINE Bot 的回覆內容。修改後儲存即可生效。
      </p>
      <SettingsForm settings={settings} />
    </div>
  );
}
