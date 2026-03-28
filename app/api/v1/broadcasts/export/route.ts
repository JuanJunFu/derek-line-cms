import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const broadcasts = await prisma.broadcast.findMany({
    orderBy: { createdAt: "desc" },
  });

  const header = "id,name,messageType,audienceType,status,sentCount,failCount,scheduledAt,sentAt,createdAt";

  const rows = broadcasts.map((b) => {
    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    return [
      b.id,
      escapeCsv(b.name),
      b.messageType,
      b.audienceType,
      b.status,
      b.sentCount,
      b.failCount,
      b.scheduledAt?.toISOString() ?? "",
      b.sentAt?.toISOString() ?? "",
      b.createdAt.toISOString(),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="broadcasts-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
