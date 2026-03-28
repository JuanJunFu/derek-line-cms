import { prisma } from "@/lib/prisma";
import { lineClient } from "@/lib/line";

/**
 * Get matching LINE user IDs based on audience type and filter.
 */
export async function getAudienceUserIds(
  audienceType: string,
  audienceFilter?: { tags?: string[]; exclude?: string[] } | null
): Promise<string[]> {
  if (audienceType === "all") {
    const users = await prisma.userProfile.findMany({
      where: { isBlocked: false },
      select: { userId: true },
    });
    return users.map((u: { userId: string }) => u.userId);
  }

  if (audienceType === "tags" && audienceFilter) {
    const { tags, exclude } = audienceFilter;

    const users = await prisma.userProfile.findMany({
      where: {
        isBlocked: false,
        ...(tags && tags.length > 0
          ? { tags: { hasSome: tags } }
          : {}),
        ...(exclude && exclude.length > 0
          ? { NOT: { tags: { hasSome: exclude } } }
          : {}),
      },
      select: { userId: true },
    });
    return users.map((u: { userId: string }) => u.userId);
  }

  return [];
}

/**
 * Count matching audience without fetching all IDs.
 */
export async function countAudience(
  audienceType: string,
  audienceFilter?: { tags?: string[]; exclude?: string[] } | null
): Promise<number> {
  if (audienceType === "all") {
    return prisma.userProfile.count({ where: { isBlocked: false } });
  }

  if (audienceType === "tags" && audienceFilter) {
    const { tags, exclude } = audienceFilter;

    return prisma.userProfile.count({
      where: {
        isBlocked: false,
        ...(tags && tags.length > 0
          ? { tags: { hasSome: tags } }
          : {}),
        ...(exclude && exclude.length > 0
          ? { NOT: { tags: { hasSome: exclude } } }
          : {}),
      },
    });
  }

  return 0;
}

/**
 * Build LINE message object from broadcast content and type.
 */
function buildMessage(
  messageType: string,
  content: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  switch (messageType) {
    case "text":
      return { type: "text", text: content.text as string };
    case "image":
      return {
        type: "image",
        originalContentUrl: content.imageUrl as string,
        previewImageUrl: content.imageUrl as string,
      };
    case "flex":
      return {
        type: "flex",
        altText: (content.altText as string) || "推播訊息",
        contents: content.contents,
      };
    case "json":
      return content;
    default:
      throw new Error(`Unsupported message type: ${messageType}`);
  }
}

/**
 * Send a broadcast by ID.
 * Updates status through sending -> sent/failed lifecycle.
 */
export async function sendBroadcast(broadcastId: string) {
  const broadcast = await prisma.broadcast.findUniqueOrThrow({
    where: { id: broadcastId },
  });

  // Mark as sending
  await prisma.broadcast.update({
    where: { id: broadcastId },
    data: { status: "sending" },
  });

  let sentCount = 0;
  let failCount = 0;

  try {
    const userIds = await getAudienceUserIds(
      broadcast.audienceType,
      broadcast.audienceFilter as { tags?: string[]; exclude?: string[] } | null
    );

    const message = buildMessage(
      broadcast.messageType,
      broadcast.content as Record<string, unknown>
    );

    // Send in batches of 500 (LINE API limit)
    const BATCH_SIZE = 500;
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      try {
        await lineClient.multicast({
          to: batch,
          messages: [message],
        });
        sentCount += batch.length;
      } catch {
        failCount += batch.length;
      }
    }

    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: {
        status: "sent",
        sentCount,
        failCount,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: {
        status: "failed",
        sentCount,
        failCount,
      },
    });
    throw error;
  }

  return { sentCount, failCount };
}
