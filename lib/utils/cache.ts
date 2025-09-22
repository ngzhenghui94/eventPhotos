import { redis } from '@/lib/upstash';
import { EVENT_STATS_TTL_SECONDS, EVENT_VERSION_TTL_SECONDS } from '@/lib/config/cache';
import type { EventStats } from '@/lib/types/common';

// JSON helpers around Upstash Redis with small, namespaced keys
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get<string>(key);
    if (!val) return null;
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const payload = JSON.stringify(value);
    // EX sets TTL in seconds
    await redis.set(key, payload, { ex: ttlSeconds });
  } catch {
    // noop
  }
}

export async function delCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {}
}

export async function cacheWrap<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const cached = await getCache<T>(key);
  if (cached !== null) return cached;
  const data = await loader();
  // Only cache truthy/defined data to avoid negative caching surprises for now
  if (data !== undefined && data !== null) {
    await setCache(key, data, ttlSeconds);
  }
  return data;
}

// -----------------------------
// Versioned event cache helpers
// -----------------------------

const eventVersionKey = (eventId: number) => `evt:${eventId}:v`;

export async function getEventVersion(eventId: number): Promise<number> {
  try {
    const v = await redis.get<number>(eventVersionKey(eventId));
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  } catch {}
  // initialize to 1 to avoid v0 keys
  try { await redis.set(eventVersionKey(eventId), 1, { ex: EVENT_VERSION_TTL_SECONDS }); } catch {}
  return 1;
}

export async function bumpEventVersion(eventId: number): Promise<number> {
  try {
    const v = await redis.incr(eventVersionKey(eventId));
    // refresh pointer TTL so it doesn't disappear while hot
    try { await redis.expire(eventVersionKey(eventId), EVENT_VERSION_TTL_SECONDS); } catch {}
    return v as unknown as number;
  } catch {
    // fallback: set to 2 if missing
    try { await redis.set(eventVersionKey(eventId), 2, { ex: EVENT_VERSION_TTL_SECONDS }); } catch {}
    return 2;
  }
}

export async function versionedKey(eventId: number, suffix: string): Promise<string> {
  const v = await getEventVersion(eventId);
  return `evt:${eventId}:v${v}:${suffix}`;
}

export async function versionedCacheWrap<T>(eventId: number, suffix: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const key = await versionedKey(eventId, suffix);
  return cacheWrap(key, ttlSeconds, loader);
}

export async function getEventStatsCached(eventId: number): Promise<EventStats | null> {
  const key = await versionedKey(eventId, 'stats');
  return getCache<EventStats>(key);
}

export async function setEventStatsCached(eventId: number, stats: EventStats): Promise<void> {
  const key = await versionedKey(eventId, 'stats');
  await setCache(key, stats, EVENT_STATS_TTL_SECONDS);
}
