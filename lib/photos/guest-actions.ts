'use server';

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { db } from '@/lib/db/drizzle';
import { photos, events } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function uploadGuestPhotosAction(formData: FormData) {
  const eventId = parseInt(formData.get('eventId') as string);
  const guestName = (formData.get('guestName') as string)?.trim();
  const guestEmail = (formData.get('guestEmail') as string)?.trim() || null;
  const files = formData.getAll('photos') as File[];

  if (!eventId || isNaN(eventId)) {
    throw new Error('Invalid event ID');
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
      accessCode: true
    }
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (!event.allowGuestUploads) {
    throw new Error('Guest uploads are not allowed for this event');
  }

  if (files.length === 0) {
    throw new Error('No files selected');
  }

  const uploadedPhotos = [];
  const uploadDir = join(process.cwd(), 'public/uploads/photos');

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
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop() || 'jpg';
      const filename = `${timestamp}-${randomString}.${extension}`;
      const filePath = join(uploadDir, filename);

      // Convert file to buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Save to database
      const [photoRecord] = await db.insert(photos).values({
        filename,
        originalFilename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        filePath: `/uploads/photos/${filename}`,
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
  revalidatePath(`/guest/${event.accessCode}`);
  
  return { success: true, count: uploadedPhotos.length };
}