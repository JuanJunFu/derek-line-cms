import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { countAudience } from "@/lib/broadcast";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { audienceType, audienceFilter } = await req.json();

  const count = await countAudience(audienceType || "all", audienceFilter || null);

  return NextResponse.json({ count });
}
