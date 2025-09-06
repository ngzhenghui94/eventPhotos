'use server';

import { join } from 'path';
import { db } from '@/lib/db/drizzle';
import { photos, events, users } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { uploadToS3, generatePhotoKey, deleteFromS3, getSignedUploadUrl, deriveThumbKey } from '@/lib/s3';
import { uploadLimitBytes, normalizePlanName, photoLimitPerEvent } from '@/lib/plans';

export async function uploadPhotosAction(formData: FormData) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

    const eventId = parseInt(formData.get('eventId') as string);
    const files = formData.getAll('photos') as File[];
    if (!eventId || isNaN(eventId)) throw new Error('Invalid event ID');

  const { getEventById } = await import('@/lib/db/queries');
  const event = await getEventById(eventId);
  const host = await db.query.users.findFirst({ where: eq(users.id, event.createdBy) });
    if (!event) throw new Error('Event not found');
    if (event.createdBy !== user.id) throw new Error('You do not have permission to upload photos to this event');
    if (files.length === 0) throw new Error('No files selected');

  const planName = host?.planName || 'free';
  const normalizedPlan = normalizePlanName(planName);
  const MAX_FILE_SIZE = uploadLimitBytes(normalizedPlan);
  const MAX_PHOTOS = photoLimitPerEvent(normalizedPlan);
  const currentCountRes = await db.select({ count: sql<number>`count(*)` }).from(photos).where(eq(photos.eventId, eventId));
  const currentCount = currentCountRes?.[0]?.count ?? 0;
  let remaining = Number.MAX_SAFE_INTEGER;
  if (MAX_PHOTOS !== null) {
    remaining = Math.max(0, MAX_PHOTOS - currentCount);
    if (remaining === 0) throw new Error('Photo limit for this event has been reached.');
  }

  const uploadedPhotos = [];
  for (const file of files.slice(0, remaining)) {
    if (file.size === 0) continue;
    if (!file.type.startsWith('image/')) continue;
    if (file.size > MAX_FILE_SIZE) continue;
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
        uploadedBy: user.id,
        guestName: null,
        guestEmail: null,
        isApproved: !event.requireApproval,
      }).returning();
      uploadedPhotos.push(photoRecord);
      // Log activity for photo upload
      const { logActivity } = await import('@/lib/db/queries');
      await logActivity({
        userId: user.id,
        action: 'UPLOAD_PHOTO',
        detail: `Uploaded photo '${file.name}' to event ${eventId}`,
      });
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
    if (uploadedPhotos.length === 0) throw new Error('No photos were uploaded successfully');
    return { success: true, count: uploadedPhotos.length };
  }

  export async function deletePhotoAction(formData: FormData) {
    const user = await getUser();
    if (!user) throw new Error('Unauthorized');

    const photoIdRaw = formData.get('photoId');
    const photoId = typeof photoIdRaw === 'string' ? parseInt(photoIdRaw) : Number(photoIdRaw);
    if (!photoId || isNaN(photoId)) throw new Error('Invalid photo ID');

    const photoRecord = await db.query.photos.findFirst({ where: eq(photos.id, photoId) });
    if (!photoRecord) throw new Error('Photo not found');
    if (photoRecord.uploadedBy !== user.id) throw new Error('You do not have permission to delete this photo');

    try {
      if (photoRecord.filePath.startsWith('s3:')) {
        const key = photoRecord.filePath.replace(/^s3:/, '');
        await deleteFromS3(key);
        try {
          const sm = deriveThumbKey(key, 'sm');
          const md = deriveThumbKey(key, 'md');
          await deleteFromS3(sm).catch(() => {});
          await deleteFromS3(md).catch(() => {});
        } catch {}
      } else {
        const fs = require('fs').promises;
        const filePath = join(process.cwd(), 'public', photoRecord.filePath);
        await fs.unlink(filePath);
      }
    } catch (fileError) {
      console.error('Error deleting media:', fileError);
    }
    try {
      await db.delete(photos).where(eq(photos.id, photoId));
    } catch (error) {
      console.error('Error deleting photo record:', error);
      throw new Error('Failed to delete photo');
    }
    return { success: true };
  }

  export async function deletePhotosBulkAction(formData: FormData) {
    const user = await getUser();
    if (!user) throw new Error('Unauthorized');

    const rawEventId = formData.get('eventId');
    const rawIds = formData.get('photoIds');
    const eventId = Number(rawEventId);
    if (!eventId || Number.isNaN(eventId)) throw new Error('Invalid event ID');
    let photoIds: number[] = [];
    try {
      const parsed = typeof rawIds === 'string' ? JSON.parse(rawIds) : [];
      if (Array.isArray(parsed)) {
        photoIds = parsed.map((n) => Number(n)).filter((n) => Number.isFinite(n));
      }
    } catch {}
    if (photoIds.length === 0) throw new Error('No photos selected');

  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!event) throw new Error('Event not found');
  if (event.createdBy !== user.id) throw new Error('You do not have permission to delete photos for this event');
  // Enforce photo limit per event (for bulk upload, not delete)
  // If you want to block bulk upload, add similar logic here

    const target = await db.query.photos.findMany({
      where: and(eq(photos.eventId, eventId), inArray(photos.id, photoIds)),
      columns: { id: true, filePath: true }
    });
    if (target.length === 0) return { count: 0 };
    const targetIds = target.map((p) => p.id);

    for (const p of target) {
      try {
        if (p.filePath?.startsWith('s3:')) {
          const key = p.filePath.replace(/^s3:/, '');
          await deleteFromS3(key).catch(() => {});
          const sm = deriveThumbKey(key, 'sm');
          const md = deriveThumbKey(key, 'md');
          await deleteFromS3(sm).catch(() => {});
          await deleteFromS3(md).catch(() => {});
        } else if (p.filePath) {
          const fs = require('fs').promises;
          const filePath = join(process.cwd(), 'public', p.filePath);
          await fs.unlink(filePath).catch(() => {});
        }
      } catch {}
    }

    await db.delete(photos).where(inArray(photos.id, targetIds));
    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath(`/dashboard/events/${event.eventCode}`);
      revalidatePath(`/events/${event.eventCode}`);
    } catch {}
    return { count: targetIds.length };
  }

  export async function createSignedUploadUrlsAction(
    eventId: number,
    files: FileMeta[],
    planName?: string | null
  ): Promise<{ uploads: UploadDescriptor[]; maxFileSize: number }> {
    const user = await getUser();
    if (!user) throw new Error('Unauthorized');
    if (!eventId || Number.isNaN(eventId)) throw new Error('Invalid event ID');
    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw new Error('Event not found');
    if (event.createdBy !== user.id) throw new Error('You do not have permission to upload photos to this event');
    // Use planName from argument, event, or user
  const plan = planName ? normalizePlanName(planName) : 'free';
    const MAX_FILE_SIZE = uploadLimitBytes(plan);
    const currentCountRes = await db.select({ count: sql<number>`count(*)` }).from(photos).where(eq(photos.eventId, eventId));
    const currentCount = currentCountRes?.[0]?.count ?? 0;
    const uploads: UploadDescriptor[] = [];
    for (const f of files) {
      if (!f || f.size === 0) continue;
      if (!f.type?.startsWith('image/')) continue;
      if (f.size > MAX_FILE_SIZE) continue;
      const key = generatePhotoKey(eventId, f.name);
      const url = await getSignedUploadUrl(key, f.type);
      uploads.push({ key, url, originalFilename: f.name, mimeType: f.type, fileSize: f.size });
    }
    if (uploads.length === 0) throw new Error('No valid files to upload');
    return { uploads, maxFileSize: MAX_FILE_SIZE };
  }

  export async function finalizeUploadedPhotosAction(
    eventId: number,
    uploaded: { key: string; originalFilename: string; mimeType: string; fileSize: number }[]
  ): Promise<{ count: number }> {
    const user = await getUser();
    if (!user) throw new Error('Unauthorized');
    if (!eventId || Number.isNaN(eventId)) throw new Error('Invalid event ID');
    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw new Error('Event not found');
    const prefix = `events/${eventId}/photos/`;
    const currentCountRes = await db.select({ count: sql<number>`count(*)` }).from(photos).where(eq(photos.eventId, eventId));
    const currentCount = currentCountRes?.[0]?.count ?? 0;
    // Get host plan and enforce photo limit
    const host = await db.query.users.findFirst({ where: eq(users.id, event.createdBy) });
    const planName = host?.planName || 'free';
    const normalizedPlan = normalizePlanName(planName);
    const MAX_PHOTOS = photoLimitPerEvent(normalizedPlan);
    let remaining = Number.MAX_SAFE_INTEGER;
    if (MAX_PHOTOS !== null) {
      remaining = Math.max(0, MAX_PHOTOS - currentCount);
      if (remaining === 0) throw new Error('Photo limit for this event has been reached.');
    }
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
    if (recordsToInsert.length === 0) throw new Error('No uploaded photos to record');
    const inserted = await db.insert(photos).values(recordsToInsert).returning();
    return { count: inserted.length };
  }

  type FileMeta = { name: string; type: string; size: number };
  type UploadDescriptor = {
    key: string;
    url: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
  };
