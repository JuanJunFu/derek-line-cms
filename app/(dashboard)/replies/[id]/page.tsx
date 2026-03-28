import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ReplyForm } from "@/components/replies/ReplyForm";

export const dynamic = "force-dynamic";

export default async function ReplyEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "new") {
    return (
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-6">新增自動回覆</h1>
        <ReplyForm />
      </div>
    );
  }

  const reply = await prisma.autoReply.findUnique({ where: { id } });
  if (!reply) notFound();

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-6">編輯自動回覆</h1>
      <ReplyForm reply={reply} />
    </div>
  );
}
