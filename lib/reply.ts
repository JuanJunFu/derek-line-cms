import { prisma } from "@/lib/prisma";

export type ReplyResult =
  | { type: "text"; text: string }
  | { type: "region_menu" }
  | { type: "product_menu" };

export async function getAutoReply(text: string): Promise<ReplyResult> {
  const replies = await prisma.autoReply.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  for (const r of replies) {
    if (r.keyword && text.includes(r.keyword)) {
      if (r.message === "SHOW_REGION_MENU") {
        return { type: "region_menu" };
      }
      if (r.message === "SHOW_PRODUCT_MENU") {
        return { type: "product_menu" };
      }
      return { type: "text", text: r.message };
    }
  }

  // Default reply (keyword is null)
  const defaultReply = replies.find((r) => !r.keyword);
  return {
    type: "text",
    text:
      defaultReply?.message ??
      "感謝您的來訊，請點選下方選單尋找門市 🙏",
  };
}
