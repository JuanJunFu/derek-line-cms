import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await prisma.userProfile.findMany({
    orderBy: { lastActive: "desc" },
  });

  const header = "userId,displayName,leadScore,relationshipLevel,customerType,tags,lastActive,firstSeen";

  const rows = profiles.map((p) => {
    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    return [
      escapeCsv(p.userId),
      escapeCsv(p.displayName ?? ""),
      p.leadScore,
      p.relationshipLevel ?? "",
      p.customerType ?? "",
      escapeCsv(p.tags.join("; ")),
      p.lastActive.toISOString(),
      p.firstSeen.toISOString(),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
