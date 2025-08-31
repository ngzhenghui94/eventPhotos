'use server';

import { join } from 'path';
import { db } from '@/lib/db/drizzle';
import { photos, events, teamMembers } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { uploadToS3, generatePhotoKey, deleteFromS3, getSignedUploadUrl } from '@/lib/s3';
import { getTeamForUser } from '@/lib/db/queries';
import { getUploadLimitForTeam, getPhotoCapForTeam } from '@/lib/plans';

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

  // Determine plan-specific max size from the event's team
  const MAX_FILE_SIZE = getUploadLimitForTeam(event.team?.planName);

  // Enforce per-event photo cap by plan
  const cap = getPhotoCapForTeam(event.team?.planName);
  const currentCountRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(photos)
    .where(eq(photos.eventId, eventId));
  const currentCount = currentCountRes?.[0]?.count ?? 0;
  let remaining = Math.max(0, cap - currentCount);
  if (remaining <= 0) {
    throw new Error('Event has reached the photo limit for your plan.');
  }

  // Only process up to remaining files
  for (const file of files.slice(0, remaining)) {
    if (file.size === 0) continue;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      continue; // Skip non-image files
    }

  // Validate file size per plan
  if (file.size > MAX_FILE_SIZE) {
      continue; // Skip files larger than 10MB
    }

    try {
      // Convert file to buffer and upload to S3
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const key = generatePhotoKey(eventId, file.name);
      await uploadToS3(key, buffer, file.type);

      // Save to database
      const [photoRecord] = await db.insert(photos).values({
        filename: key.split('/').pop() || file.name,
        originalFilename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        filePath: `s3:${key}`,
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

  // Delete object from S3 if stored there, otherwise try filesystem as fallback
  try {
    if (photo.filePath.startsWith('s3:')) {
      const key = photo.filePath.replace(/^s3:/, '');
      await deleteFromS3(key);
    } else {
      const fs = require('fs').promises;
      const filePath = join(process.cwd(), 'public', photo.filePath);
      await fs.unlink(filePath);
    }
  } catch (fileError) {
    console.error('Error deleting media:', fileError);
    // Continue with database deletion even if media deletion fails
  }

  try {
    // Delete from database
    await db.delete(photos).where(eq(photos.id, photoId));
  } catch (error) {
    console.error('Error deleting photo record:', error);
    throw new Error('Failed to delete photo');
  }

  // Perform redirect outside of try/catch so the framework can handle it
  redirect(`/dashboard/events/${photo.eventId}`);
}

// New: Direct-to-S3 upload flow to avoid Server Actions 10MB body limit

type FileMeta = { name: string; type: string; size: number };
type UploadDescriptor = {
  key: string;
  url: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
};

export async function createSignedUploadUrlsAction(
  eventId: number,
  files: FileMeta[]
): Promise<{ uploads: UploadDescriptor[]; maxFileSize: number }> {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  if (!eventId || Number.isNaN(eventId)) {
    throw new Error('Invalid event ID');
  }

  // Verify event exists and user has access
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: { team: true }
  });
  if (!event) throw new Error('Event not found');

  const userTeam = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    columns: { teamId: true }
  });
  if (!userTeam || userTeam.teamId !== event.teamId) {
    throw new Error('You do not have permission to upload photos to this event');
  }

  // Plan-specific per-file validation based on the event's team
  const MAX_FILE_SIZE = getUploadLimitForTeam(event.team?.planName);

  // Determine remaining capacity for this event
  const cap = getPhotoCapForTeam(event.team?.planName);
  const currentCountRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(photos)
    .where(eq(photos.eventId, eventId));
  const currentCount = currentCountRes?.[0]?.count ?? 0;
  let remaining = Math.max(0, cap - currentCount);
  if (remaining <= 0) {
    throw new Error('Event has reached the photo limit for your plan.');
  }

  const uploads: UploadDescriptor[] = [];
  for (const f of files) {
    if (!f || f.size === 0) continue;
    if (!f.type?.startsWith('image/')) continue;
    if (f.size > MAX_FILE_SIZE) continue;

    if (remaining <= 0) break;
    const key = generatePhotoKey(eventId, f.name);
  const url = await getSignedUploadUrl(key, f.type);
    uploads.push({
      key,
      url,
      originalFilename: f.name,
      mimeType: f.type,
      fileSize: f.size,
    });
    remaining -= 1;
  }

  if (uploads.length === 0) {
    throw new Error('No valid files to upload');
  }

  return { uploads, maxFileSize: MAX_FILE_SIZE };
}

export async function finalizeUploadedPhotosAction(
  eventId: number,
  uploaded: { key: string; originalFilename: string; mimeType: string; fileSize: number }[]
): Promise<{ count: number }> {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  if (!eventId || Number.isNaN(eventId)) {
    throw new Error('Invalid event ID');
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: { team: true }
  });
  if (!event) throw new Error('Event not found');

  const userTeam = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    columns: { teamId: true }
  });
  if (!userTeam || userTeam.teamId !== event.teamId) {
    throw new Error('You do not have permission to upload photos to this event');
  }

  // Only accept keys within the event's expected prefix
  const prefix = `events/${eventId}/photos/`;
  // Enforce remaining capacity
  const cap = getPhotoCapForTeam(event.team?.planName);
  const currentCountRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(photos)
    .where(eq(photos.eventId, eventId));
  const currentCount = currentCountRes?.[0]?.count ?? 0;
  let remaining = Math.max(0, cap - currentCount);

  const recordsToInsert = uploaded
    .filter((u) => u.key.startsWith(prefix))
    .slice(0, Math.max(0, remaining))
    .map((u) => ({
      filename: u.key.split('/').pop() || u.originalFilename,
      originalFilename: u.originalFilename,
      mimeType: u.mimeType,
      fileSize: u.fileSize,
      filePath: `s3:${u.key}`,
      eventId,
      uploadedBy: user.id,
      guestName: null,
      guestEmail: null,
      isApproved: !event.requireApproval,
    }));

  if (recordsToInsert.length === 0) {
    throw new Error('No uploaded photos to record');
  }

  const inserted = await db.insert(photos).values(recordsToInsert).returning();
  return { count: inserted.length };
}