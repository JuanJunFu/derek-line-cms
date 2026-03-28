import { prisma } from "@/lib/prisma";
import { BroadcastClient } from "@/components/broadcasts/BroadcastClient";

export const dynamic = "force-dynamic";

export default async function BroadcastsPage() {
  const broadcasts = await prisma.broadcast.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="max-w-full lg:max-w-4xl">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">
        群發推播
      </h1>
      <p className="text-xs text-[var(--text-muted)] mb-6">
        建立推播訊息，選擇受眾後發送或排程。支援文字、圖片、Flex Message。
      </p>
      <BroadcastClient
        initialBroadcasts={broadcasts.map((b) => ({
          ...b,
          content: b.content as any,
          audienceFilter: b.audienceFilter as any,
          scheduledAt: b.scheduledAt?.toISOString() ?? null,
          sentAt: b.sentAt?.toISOString() ?? null,
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
