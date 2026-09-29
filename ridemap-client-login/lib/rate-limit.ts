/**
 * Simple in-memory sliding-window limiter.
 * Per-instance only: on serverless each instance has its own memory, so swap
 * this for Redis/Upstash before relying on it in production.
 */
const hits = new Map<string, number[]>();

export interface Limit {
  key: string;
  max: number;
  windowMs: number;
}

function recent(key: string, windowMs: number, now: number): number[] {
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.set(key, list);
  return list;
}

/** Records a hit against every limit only if none of them is exhausted. */
export function consume(limits: Limit[], now = Date.now()): { ok: boolean } {
  const lists = limits.map((l) => recent(l.key, l.windowMs, now));
  if (lists.some((list, i) => list.length >= limits[i].max)) return { ok: false };
  lists.forEach((list) => list.push(now));
  return { ok: true };
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
