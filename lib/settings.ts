import { prisma } from "@/lib/prisma";

const cache = new Map<string, { value: string; ts: number }>();
const TTL = 60_000; // 1 minute cache

export async function getSetting(key: string): Promise<string> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < TTL) return cached.value;

  const row = await prisma.siteSetting.findUnique({ where: { key } });
  const value = row?.value ?? "";
  cache.set(key, { value, ts: Date.now() });
  return value;
}

export async function getSettings(
  keys: string[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const missing: string[] = [];

  for (const key of keys) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < TTL) {
      result[key] = cached.value;
    } else {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: missing } },
    });
    for (const row of rows) {
      result[row.key] = row.value;
      cache.set(row.key, { value: row.value, ts: Date.now() });
    }
  }

  return result;
}
