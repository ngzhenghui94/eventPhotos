'use server';

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { db } from '@/lib/db/drizzle';
import { photos, events, teamMembers } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export async function uploadPhotosAction(formData: FormData) {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const eventId = parseInt(formData.get('eventId') as string);
  const files = formData.getAll('photos') as File[];

  if (!eventId || isNaN(eventId)) {
    throw new Error('Invalid event ID');
  }

  // Verify event exists and user has access
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: { team: true }
  });

  if (!event) {
    throw new Error('Event not found');
  }

  // Check if user is part of the team that owns this event
  const userTeam = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    columns: { teamId: true }
  });

  if (!userTeam || userTeam.teamId !== event.teamId) {
    throw new Error('You do not have permission to upload photos to this event');
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
        uploadedBy: user.id,
        guestName: null,
        guestEmail: null,
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

  redirect(`/dashboard/events/${eventId}`);
}

export async function deletePhotoAction(formData: FormData) {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const photoId = parseInt(formData.get('photoId') as string);
  if (!photoId || isNaN(photoId)) {
    throw new Error('Invalid photo ID');
  }

  // Get photo with event and team info
  const photo = await db.query.photos.findFirst({
    where: eq(photos.id, photoId),
    with: {
      event: {
        with: { team: true }
      }
    }
  });

  if (!photo) {
    throw new Error('Photo not found');
  }

  // Check if user has permission (uploaded by them or team member)
  const userTeam = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    columns: { teamId: true }
  });

  const canDelete = photo.uploadedBy === user.id || 
                   (userTeam && userTeam.teamId === photo.event.teamId);

  if (!canDelete) {
    throw new Error('You do not have permission to delete this photo');
  }

  try {
    // Delete file from filesystem
    const fs = require('fs').promises;
    const filePath = join(process.cwd(), 'public', photo.filePath);
    try {
      await fs.unlink(filePath);
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await db.delete(photos).where(eq(photos.id, photoId));
    
    redirect(`/dashboard/events/${photo.eventId}`);
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw new Error('Failed to delete photo');
  }
}