import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { photos, users as usersTable, events as eventsTable } from '@/lib/db/schema';
import { getEventById, getUser, canUserAccessEvent } from '@/lib/db/queries';
import { eq, sql } from 'drizzle-orm';
import { redis } from '@/lib/upstash';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const eventId = Number(payload?.eventId);
    const items: Array<{ key: string; originalFilename: string; mimeType: string; fileSize: number }> = Array.isArray(payload?.items) ? payload.items : [];
    if (!eventId || !Number.isFinite(eventId)) return Response.json({ error: 'Invalid event ID' }, { status: 400 });
    if (!items.length) return Response.json({ error: 'No items' }, { status: 400 });

    const event = await getEventById(eventId);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    const user = await getUser();
    const canAccess = await canUserAccessEvent(eventId, { userId: user?.id });
    if (!canAccess) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const prefix = `events/${eventId}/photos/`;
    const records = items
      .filter((i) => typeof i.key === 'string' && i.key.startsWith(prefix))
      .map((u) => ({
        filename: u.key.split('/').pop() || u.originalFilename,
        originalFilename: u.originalFilename,
        mimeType: u.mimeType,
        fileSize: u.fileSize,
        filePath: `s3:${u.key}`,
        eventId,
        uploadedBy: user?.id,
        guestName: null,
        guestEmail: null,
        isApproved: !event.requireApproval,
      }));
    if (records.length === 0) return Response.json({ error: 'No valid items' }, { status: 400 });
    const inserted = await db.insert(photos).values(records).returning({ id: photos.id });
    // Invalidate event photo list and counts, and user event list cache
    try {
      await Promise.all([
        redis.del(`evt:${eventId}:photos`),
        // recompute count lazily; just clear so it will refresh
        redis.del(`evt:${eventId}:photoCount`),
      ]);
      const ownerId = event.createdBy;
      if (ownerId) {
        await redis.del(`user:${ownerId}:events:list:v2`);
      }
    } catch {}
    return Response.json({ count: inserted.length });
  } catch (err) {
    console.error('finalize error', err);
    return Response.json({ error: 'Failed to finalize uploads' }, { status: 500 });
  }
}


