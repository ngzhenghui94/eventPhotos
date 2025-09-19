import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/drizzle';
import { photos, users as usersTable } from '@/lib/db/schema';
import { getEventById } from '@/lib/db/queries';
import { getSignedUploadUrl, generatePhotoKey } from '@/lib/s3';
import { uploadLimitBytes, normalizePlanName, photoLimitPerEvent } from '@/lib/plans';
import { sql, eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FileMeta = { name: string; type: string; size: number };

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const eventId = Number(payload?.eventId);
    const files: FileMeta[] = Array.isArray(payload?.files) ? payload.files : [];
    const accessFromBody: string = typeof payload?.accessCode === 'string' ? payload.accessCode : '';
    console.info('[api][guest-presign][start]', { eventId, fileCount: files.length, userAgent: request.headers.get('user-agent'), origin: request.headers.get('origin') });
    if (!eventId || !Number.isFinite(eventId)) return Response.json({ error: 'Invalid event ID' }, { status: 400 });
    if (!files.length) return Response.json({ error: 'No files provided' }, { status: 400 });

    const event = await getEventById(eventId);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    // Private event access: cookie/header/body
    if (!event.isPublic) {
      const cookieKey = `evt:${event.eventCode}:access`;
      const accessFromCookie = (await cookies()).get(cookieKey)?.value?.toUpperCase().trim();
      const accessFromHeader = request.headers.get('x-access-code')?.toUpperCase().trim();
      const provided = (accessFromCookie || accessFromHeader || accessFromBody)?.toUpperCase().trim();
      if (!provided || provided !== event.accessCode.toUpperCase()) {
        console.warn('[api][guest-presign][access-denied]', { eventId });
        return Response.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Limits based on host plan
    const host = await db.query.users.findFirst({ where: eq(usersTable.id, event.createdBy), columns: { planName: true } });
    const plan = normalizePlanName(host?.planName || 'free');
    const MAX_FILE_SIZE = uploadLimitBytes(plan);
    const MAX_PHOTOS = photoLimitPerEvent(plan);
    const current = await db.select({ count: sql<number>`count(*)` }).from(photos).where(eq(photos.eventId, eventId));
    const currentCount = current?.[0]?.count ?? 0;
    let remaining = Number.MAX_SAFE_INTEGER;
    if (MAX_PHOTOS !== null) remaining = Math.max(0, MAX_PHOTOS - currentCount);
    if (remaining === 0) return Response.json({ error: 'Photo limit for this event has been reached.' }, { status: 400 });

    const uploads: Array<{ key: string; url: string; originalFilename: string; mimeType: string; fileSize: number }> = [];
    for (const f of files) {
      if (!f || !f.size || !f.type?.startsWith('image/')) continue;
      if (f.size > MAX_FILE_SIZE) continue;
      if (uploads.length >= remaining) break;
      const key = generatePhotoKey(eventId, f.name);
      const url = await getSignedUploadUrl(key, f.type);
      uploads.push({ key, url, originalFilename: f.name, mimeType: f.type, fileSize: f.size });
    }
    if (uploads.length === 0) {
      console.warn('[api][guest-presign][no-valid-files]', { eventId, files });
      return Response.json({ error: 'No valid files to upload' }, { status: 400 });
    }
    console.info('[api][guest-presign][ok]', { eventId, count: uploads.length, maxFileSize: MAX_FILE_SIZE });
    return Response.json({ uploads, maxFileSize: MAX_FILE_SIZE });
  } catch (err) {
    console.error('[api][guest-presign][error]', err);
    return Response.json({ error: 'Failed to create presigned URLs' }, { status: 500 });
  }
}


