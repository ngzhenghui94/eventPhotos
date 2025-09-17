import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { photos, ActivityType } from '@/lib/db/schema';
import { getUser, getEventById } from '@/lib/db/queries';
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const eventId = parseInt(formData.get('eventId') as string);
    const file = formData.get('file') as File;
  // Accept both demo/gallery fields (uploaderName/uploaderEmail) and guest upload fields (guestName/guestEmail)
  const uploaderName = (formData.get('uploaderName') || formData.get('guestName')) as string;
  const uploaderEmail = (formData.get('uploaderEmail') || formData.get('guestEmail')) as string;
  // Access code can arrive via header, query, or form (for private guest uploads)
  const url = new URL(request.url);
  const accessCode = (request.headers.get('x-access-code') || url.searchParams.get('code') || (formData.get('accessCode') as string) || '').toUpperCase().trim();

    if (!eventId || !file) {
      return Response.json({ error: 'Event ID and file are required' }, { status: 400 });
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

  // Check file size (20MB limit)
    if (file.size > 10 * 1024 * 1024) {
  return Response.json({ error: 'File size must be less than 20MB' }, { status: 400 });
    }

  const user = await getUser();
    

    // Teams feature removed; only allow uploads for demo event
    if (!eventId || !file) {
      return Response.json({ error: 'Event ID and file are required' }, { status: 400 });
    }

    // Get event details
    const event = await getEventById(eventId);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

  // If this is the demo event (access code DEMO), apply IP rate limit
    if (event.accessCode === DEMO_ACCESS_CODE) {
      // Improved IP extraction: checks multiple headers, falls back to request.ip if available
      let ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
      if (!ip || ip === '' || ip === '::1' || ip === '127.0.0.1') {
        ip = request.headers.get('x-real-ip')?.trim();
      }
      // Next.js edge runtime may not provide request.ip, but fallback if available
      if ((!ip || ip === '') && (request as any).ip) {
        ip = (request as any).ip;
      }
      // If still no IP, use a unique string for local/dev, but do not default to '1' or null
      if (!ip || ip === '') {
        ip = 'unknown-ip';
      }
      const rl = await rateLimitDemo(ip);
      if (!rl.ok) {
        const waitMins = Math.ceil(((rl.retryAt! - Date.now()) / 1000) / 60);
        return Response.json({ error: `Demo limit reached. Try again in ~${waitMins} min.` }, { status: 429 });
      }
    }

  // Upload to S3
  const key = generatePhotoKey(eventId, file.name);
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await uploadToS3(key, fileBuffer, file.type);
  const filename = key.split('/').pop() || file.name;

  // Save photo record to database
    const [newPhoto] = await db.insert(photos).values({
      eventId,
      filename,
      originalFilename: file.name,
      mimeType: file.type,
      fileSize: file.size,
  filePath: `s3:${key}`,
  uploadedBy: user?.id || null,
  guestName: user ? null : (uploaderName || null),
  guestEmail: user ? null : (uploaderEmail || null),
      isApproved: !event.requireApproval,
    }).returning();

    // Prime Redis metadata cache for fast subsequent access
    try {
      const metaKey = `photo:meta:${newPhoto.id}`;
      const metaVal = { eventId: event.id, s3Key: key, filePath: `s3:${key}` };
      await redis.set(metaKey, metaVal, { ex: 60 * 60 * 24 * 7 });
    } catch {}

    // Revalidate the guest page so newly uploaded photos appear on refresh
    try {
      if (event.eventCode) {
        revalidatePath(`/events/${event.eventCode}`);
      }
    } catch {}


  // Teams feature removed; no activity logging

    return Response.json(newPhoto, { status: 201 });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return Response.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
}