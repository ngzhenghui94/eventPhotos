import { redis } from '@/lib/upstash';

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
