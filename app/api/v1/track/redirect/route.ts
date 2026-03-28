import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Tracking redirect — records an event then 302 redirects to the target URI.
 * Used by LINE Flex Message URI buttons to track clicks (nav, call, LINE)
 * while still opening the target in one tap.
 *
 * Query params:
 *   action   — event type (STORE_NAV, STORE_CALL, STORE_LINE)
 *   storeId  — store ID
 *   uri      — final redirect destination (URL-encoded)
 *   userId   — LINE user ID (optional, for attribution)
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const action = params.get("action") || "UNKNOWN";
  const storeId = params.get("storeId") || "";
  const uri = params.get("uri") || "";
  const userId = params.get("userId") || null;

  if (!uri) {
    return NextResponse.json({ error: "Missing uri" }, { status: 400 });
  }

  // Fire-and-forget tracking — don't block the redirect
  try {
    await prisma.event.create({
      data: {
        type: action,
        userId: userId,
        data: { storeId } as any,
      },
    });
  } catch (e) {
    console.error("[track/redirect] Failed to record event:", e);
  }

  return NextResponse.redirect(uri, 302);
}
