// ...existing code...
'use server';

import { join } from 'path';
import { photos, events } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { uploadToS3, generatePhotoKey } from '@/lib/s3';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { photoLimitPerEvent, normalizePlanName, uploadLimitBytes } from '@/lib/plans';
import { FileOperationUtils } from '@/lib/utils/files';
import { withDatabaseErrorHandling, validateRequiredFields, safeParseInt } from '@/lib/utils/database';

export async function uploadGuestPhotosAction(formData: FormData) {
  return withDatabaseErrorHandling(async () => {
    const eventId = safeParseInt(formData.get('eventId') as string, 'Event ID');
    const eventCodeFromForm = (formData.get('eventCode') as string | null)?.trim().toUpperCase() || null;
    const guestName = (formData.get('guestName') as string)?.trim();
    const guestEmail = (formData.get('guestEmail') as string)?.trim() || null;
    const files = formData.getAll('photos') as File[];

    // Validate required fields
    validateRequiredFields({ guestName }, ['guestName']);

    if (files.length === 0) {
      throw new Error('No files provided');
    }

    // Query event with all required fields
    type EventType = {
      id: number;
      allowGuestUploads: boolean;
      requireApproval: boolean;
      accessCode: string;
      eventCode: string;
      isPublic: boolean;
      createdBy: number;
    };
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
      columns: {
        id: true,
        allowGuestUploads: true,
        requireApproval: true,
        accessCode: true,
        eventCode: true,
        isPublic: true,
        createdBy: true,
      }
    }) as EventType | null;

    if (!event) throw new Error('Event not found');
    if (!event.allowGuestUploads) throw new Error('Guest uploads are not allowed for this event');
    if (!event.isPublic) {
      const cookieKey = `evt:${event.eventCode}:access`;
      const code = (await cookies()).get(cookieKey)?.value?.toUpperCase().trim();
      if (!code || code !== event.accessCode.toUpperCase()) {
        throw new Error('Access code required to upload to this private event');
      }
    }
    if (!Array.isArray(files) || files.length === 0) throw new Error('No files selected');

    // Get host plan and enforce photo limit
    const host = await db.query.users.findFirst({ where: eq(users.id, event.createdBy) });
    const planName = host?.planName || 'free';
    const normalizedPlan = normalizePlanName(planName);
    const MAX_PHOTOS = photoLimitPerEvent(normalizedPlan);
    const MAX_FILE_SIZE = uploadLimitBytes(normalizedPlan);
    
    const currentCountRes = await db.select({ count: sql<number>`count(*)` }).from(photos).where(eq(photos.eventId, eventId));
    const currentCount = currentCountRes?.[0]?.count ?? 0;
    let remaining = Number.MAX_SAFE_INTEGER;
    if (MAX_PHOTOS !== null) {
      remaining = Math.max(0, MAX_PHOTOS - currentCount);
      if (remaining === 0) throw new Error('Photo limit for this event has been reached.');
    }

    // Validate and filter files
    const validFiles = FileOperationUtils.validatePhotoFiles(
      files.slice(0, remaining) as File[], 
      MAX_FILE_SIZE
    );

    // Upload photos
    const uploadedPhotos = [];
    for (const file of validFiles) {
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const key = generatePhotoKey(eventId, file.name);
        await uploadToS3(key, buffer, file.type);
        
        const [photoRecord] = await db.insert(photos).values({
          filename: key.split('/').pop() || file.name,
          originalFilename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          filePath: `s3:${key}`,
          eventId,
          uploadedBy: null,
          guestName: guestName,
          guestEmail: guestEmail,
          isApproved: !event.requireApproval,
        }).returning();
        
        uploadedPhotos.push(photoRecord);
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
    
    if (uploadedPhotos.length === 0) {
      throw new Error('No photos were uploaded successfully');
    }
    
    revalidatePath(`/events/${event.eventCode}`);
    return { success: true, count: uploadedPhotos.length };
  }, 'uploadGuestPhotosAction');
}