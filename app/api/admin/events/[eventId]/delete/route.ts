import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { events, photos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '@/lib/upstash';
import { bumpEventVersion } from '@/lib/utils/cache';

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  await requireSuperAdmin();
  const { eventId: eventIdParam } = await context.params;
  const eventId = Number(eventIdParam);
  if (!eventId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  // capture event and photo IDs for cache invalidation before delete
  const ev = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  const photoIds = (await db.query.photos.findMany({
    where: eq(photos.eventId, eventId),
    columns: { id: true }
  })).map(p => p.id);
  // delete photos first to avoid FK constraint issues
  await db.delete(photos).where(eq(photos.eventId, eventId));
  await db.delete(events).where(eq(events.id, eventId));
  // Invalidate caches for event, photos, timeline, counts, and owner list
  try {
    await Promise.all([
      redis.del(`evt:id:${eventId}`),
      ev?.eventCode ? redis.del(`evt:code:${ev.eventCode}`) : Promise.resolve(),
      bumpEventVersion(eventId),
      redis.del(`evt:${eventId}:timeline`),
    ]);
    // Best-effort per-photo cache clears
    if (photoIds.length) {
      await Promise.all(photoIds.flatMap(pid => [
        redis.del(`photo:meta:${pid}`),
        redis.del(`photo:url:${pid}`),
        redis.del(`photo:thumb:url:${pid}`),
      ]));
    }
    // clear user events list caches if we can find owner
    if (ev?.createdBy) {
      await redis.del(`user:${ev.createdBy}:events:list:v2`);
    }
  } catch {}
  return NextResponse.redirect(new URL('/dashboard/admin/events', request.url), { status: 303 });
}
