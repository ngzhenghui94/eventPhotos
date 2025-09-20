import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { photos, ActivityType } from '@/lib/db/schema';
import { getUser, getEventById, canUserAccessEvent } from '@/lib/db/queries';
import { generatePhotoKey, uploadToS3 } from '@/lib/s3';
import { DEMO_ACCESS_CODE } from '@/lib/db/demo';
import { redis } from '@/lib/upstash';


// Redis-based rate limit for demo: 5 uploads per IP per hour
async function rateLimitDemo(ip: string | null | undefined) {
  if (!ip) return { ok: true };
  const key = `demo-upload-rate:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    // Set expiry for 1 hour on first upload
    await redis.expire(key, 60 * 60);
  }
  if (count > 5) {
    const ttl = await redis.ttl(key);
    const retryAt = Date.now() + ttl * 1000;
    return { ok: false, retryAt } as const;
  }
  return { ok: true } as const;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Backward-compatible endpoint: still accepts multipart in low-volume cases,
// but recommend using /api/photos/presign + /api/photos/finalize for large loads.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const eventId = parseInt(formData.get('eventId') as string);
    const file = formData.get('file') as File;
    if (!eventId || !file) {
      return Response.json({ error: 'Event ID and file are required' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'Only image files are allowed' }, { status: 400 });
    }
    // 8MB soft limit here; direct-to-S3 path is recommended for larger files
    if (file.size > 8 * 1024 * 1024) {
      return Response.json({ error: 'File too large for direct API upload. Use presigned upload.' }, { status: 413 });
    }

    const event = await getEventById(eventId);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    const user = await getUser();
    const canAccess = await canUserAccessEvent(eventId, { userId: user?.id });

    if (!canAccess) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const key = generatePhotoKey(eventId, file.name);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await uploadToS3(key, fileBuffer, file.type);
    const filename = key.split('/').pop() || file.name;
    const [newPhoto] = await db.insert(photos).values({
      eventId,
      filename,
      originalFilename: file.name,
      mimeType: file.type,
      fileSize: file.size,
      filePath: `s3:${key}`,
      uploadedBy: user?.id,
      guestName: null,
      guestEmail: null,
      isApproved: !event.requireApproval,
    }).returning();
  // Invalidate cached photo list for this event
  try { await redis.del(`evt:${eventId}:photos`); } catch {}
    return Response.json(newPhoto, { status: 201 });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return Response.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
}