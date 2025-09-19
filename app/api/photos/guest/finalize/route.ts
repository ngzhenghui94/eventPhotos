import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { photos } from '@/lib/db/schema';
import { getEventById } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const eventId = Number(payload?.eventId);
    const guestName = typeof payload?.guestName === 'string' ? payload.guestName : null;
    const guestEmail = typeof payload?.guestEmail === 'string' ? payload.guestEmail : null;
    const items: Array<{ key: string; originalFilename: string; mimeType: string; fileSize: number }> = Array.isArray(payload?.items) ? payload.items : [];
    console.info('[api][guest-finalize][start]', { eventId, count: items.length });
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
      console.warn('[api][guest-finalize][no-valid-items]', { eventId, items });
      return Response.json({ error: 'No valid items' }, { status: 400 });
    }
    const inserted = await db.insert(photos).values(records).returning({ id: photos.id });
    console.info('[api][guest-finalize][ok]', { eventId, count: inserted.length });
    return Response.json({ count: inserted.length });
  } catch (err) {
    console.error('[api][guest-finalize][error]', err);
    return Response.json({ error: 'Failed to finalize uploads' }, { status: 500 });
  }
}


