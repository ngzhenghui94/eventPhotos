import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { photos, ActivityType } from '@/lib/db/schema';
import { getUser, canUserUploadToEvent, logActivity, getEventById } from '@/lib/db/queries';
import { generatePhotoKey, uploadToS3 } from '@/lib/s3';
import { DEMO_ACCESS_CODE } from '@/lib/db/demo';

// Simple in-memory rate limit for demo: 5 uploads per IP per hour
const demoRateMap = new Map<string, { count: number; resetAt: number }>();
function rateLimitDemo(ip: string | null | undefined) {
  if (!ip) return { ok: true };
  const now = Date.now();
  const rec = demoRateMap.get(ip);
  if (!rec || rec.resetAt < now) {
    demoRateMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return { ok: true };
  }
  if (rec.count >= 5) return { ok: false, retryAt: rec.resetAt } as const;
  rec.count += 1;
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
    
    // Check if user can upload to this event (supports guest uploads for private events with valid access code)
    const canUpload = await canUserUploadToEvent(eventId, user?.id, accessCode || null);
    if (!canUpload) {
      return Response.json({ error: 'Not authorized to upload to this event' }, { status: 403 });
    }

    // Get event details
    const event = await getEventById(eventId);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

  // If this is the demo event (access code DEMO), apply IP rate limit
    if (event.accessCode === DEMO_ACCESS_CODE) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
      const rl = rateLimitDemo(ip);
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

    // Revalidate the guest page so newly uploaded photos appear on refresh
    try {
      if (event.eventCode) {
        revalidatePath(`/events/${event.eventCode}`);
      }
    } catch {}

    // Log activity
    if (user) {
      await logActivity(event.teamId, user.id, ActivityType.UPLOAD_PHOTO);
    }

    return Response.json(newPhoto, { status: 201 });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return Response.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
}