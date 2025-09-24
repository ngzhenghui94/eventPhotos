import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { photos } from '@/lib/db/schema';
import { getEventById } from '@/lib/db/queries';
import { redis } from '@/lib/upstash';
import { bumpEventVersion } from '@/lib/utils/cache';
import { getEventStatsCached, setEventStatsCached } from '@/lib/utils/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const eventId = Number(payload?.eventId);
    const guestName = typeof payload?.guestName === 'string' ? payload.guestName : null;
    const guestEmail = typeof payload?.guestEmail === 'string' ? payload.guestEmail : null;
  const items: Array<{ key: string; originalFilename: string; mimeType: string; fileSize: number }> = Array.isArray(payload?.items) ? payload.items : [];
    if (!eventId || !Number.isFinite(eventId)) return Response.json({ error: 'Invalid event ID' }, { status: 400 });
    if (!items.length) return Response.json({ error: 'No items' }, { status: 400 });

    const event = await getEventById(eventId);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

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
        uploadedBy: null,
        guestName: guestName,
        guestEmail: guestEmail,
        isApproved: !event.requireApproval,
      }));
    if (records.length === 0) {
      return Response.json({ error: 'No valid items' }, { status: 400 });
    }
    const inserted = await db.insert(photos).values(records).returning({ id: photos.id });
    // Invalidate via version bump and clear owner list cache
    try {
      await bumpEventVersion(eventId);
      const ownerId = event.createdBy;
      if (ownerId) {
        await redis.del(`user:${ownerId}:events:list:v2`);
      }
      // Warm/update stats optimistically
      try {
        const prev = await getEventStatsCached(eventId);
        if (prev) {
          const delta = inserted.length;
          const approvedDelta = event.requireApproval ? 0 : delta;
          const next = {
            totalPhotos: prev.totalPhotos + delta,
            approvedPhotos: prev.approvedPhotos + approvedDelta,
            pendingApprovals: Math.max(0, (prev.totalPhotos + delta) - (prev.approvedPhotos + approvedDelta)),
            lastUploadAt: new Date().toISOString(),
          };
          await setEventStatsCached(eventId, next);
        }
      } catch {}
    } catch {}
    return Response.json({ count: inserted.length });
  } catch (err) {
    console.error('[api][guest-finalize][error]', err);
    return Response.json({ error: 'Failed to finalize uploads' }, { status: 500 });
  }
}


