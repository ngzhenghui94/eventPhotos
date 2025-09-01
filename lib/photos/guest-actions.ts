'use server';

import { join } from 'path';
import { db } from '@/lib/db/drizzle';
import { photos, events } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { uploadToS3, generatePhotoKey } from '@/lib/s3';

export async function uploadGuestPhotosAction(formData: FormData) {
  let eventId = parseInt(formData.get('eventId') as string);
  const eventCodeFromForm = (formData.get('eventCode') as string | null)?.trim().toUpperCase() || null;
  const guestName = (formData.get('guestName') as string)?.trim();
  const guestEmail = (formData.get('guestEmail') as string)?.trim() || null;
  const files = formData.getAll('photos') as File[];

  // Allow fallback via eventCode when eventId is not provided
  if (!eventId || isNaN(eventId)) {
    let resolvedCode = eventCodeFromForm;
    if (!resolvedCode) {
      // Try to infer from cookies like evt:{EVENTCODE}:access
      const jar = await cookies();
      // @ts-ignore - getAll exists in Next cookies API
      const all = typeof jar.getAll === 'function' ? jar.getAll() : [];
      const match = all.find((c: any) => typeof c?.name === 'string' && c.name.startsWith('evt:') && c.name.endsWith(':access'));
      if (match) {
        const name: string = match.name;
        resolvedCode = name.slice(4, -7).toUpperCase();
      }
    }
    if (!resolvedCode) {
      throw new Error('Invalid event ID');
    }
    const byCode = await db.query.events.findFirst({
      where: eq(events.eventCode, resolvedCode),
      columns: { id: true },
    });
    if (!byCode) throw new Error('Event not found');
    eventId = byCode.id;
  }

  if (!guestName) {
    throw new Error('Guest name is required');
  }

  // Verify event exists and allows guest uploads
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: {
      id: true,
      allowGuestUploads: true,
      requireApproval: true,
      accessCode: true,
      eventCode: true,
      isPublic: true,
    }
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (!event.allowGuestUploads) {
    throw new Error('Guest uploads are not allowed for this event');
  }

  // For private events, require a valid access code previously entered on the guest page
  if (!event.isPublic) {
    const cookieKey = `evt:${event.eventCode}:access`;
    const code = (await cookies()).get(cookieKey)?.value?.toUpperCase().trim();
    if (!code || code !== event.accessCode.toUpperCase()) {
      throw new Error('Access code required to upload to this private event');
    }
  }

  if (files.length === 0) {
    throw new Error('No files selected');
  }

  const uploadedPhotos = [];

  for (const file of files) {
    if (file.size === 0) continue;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      continue; // Skip non-image files
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      continue; // Skip files larger than 10MB
    }

    try {
  // Convert file to buffer and upload to S3
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
  const key = generatePhotoKey(event.id, file.name);
  await uploadToS3(key, buffer, file.type);

      // Save to database
      const [photoRecord] = await db.insert(photos).values({
  filename: key.split('/').pop() || file.name,
        originalFilename: file.name,
        mimeType: file.type,
        fileSize: file.size,
  filePath: `s3:${key}`,
        eventId,
        uploadedBy: null, // Guest upload
  guestName,
  guestEmail,
        isApproved: !event.requireApproval, // Auto-approve if not required
      }).returning();

      uploadedPhotos.push(photoRecord);
    } catch (error) {
      console.error('Error uploading file:', error);
      // Continue with other files
    }
  }

  if (uploadedPhotos.length === 0) {
    throw new Error('No photos were uploaded successfully');
  }

  // Revalidate the guest page to show new photos
  revalidatePath(`/events/${event.eventCode}`);
  
  return { success: true, count: uploadedPhotos.length };
}