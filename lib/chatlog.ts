import { prisma } from "@/lib/prisma";

export async function logChatMessage(params: {
  userId: string;
  direction: "inbound" | "outbound";
  msgType: string;
  content: any;
}): Promise<void> {
  try {
    await prisma.chatMessage.create({
      data: {
        userId: params.userId,
        direction: params.direction,
        msgType: params.msgType,
        content: params.content,
      },
    });
  } catch (error) {
    console.error("[chatlog] Failed to log chat message:", error);
  }
}
