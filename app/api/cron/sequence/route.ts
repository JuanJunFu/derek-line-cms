import { NextRequest, NextResponse } from "next/server";
import { processScheduledMessages } from "@/lib/sequence";

/**
 * Vercel Cron endpoint — runs every hour.
 * Configured in vercel.json: { "crons": [{ "path": "/api/cron/sequence", "schedule": "0 * * * *" }] }
 *
 * Security: Vercel automatically sets the Authorization header with the CRON_SECRET
 * env var for cron-triggered requests. We reject all other callers.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processScheduledMessages();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/sequence] Failed:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

// Also support GET for Vercel Cron (which uses GET by default)
export async function GET(req: NextRequest) {
  return POST(req);
}
