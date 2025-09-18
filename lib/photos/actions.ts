'use server';

import { join } from 'path';
import { db } from '@/lib/db/drizzle';
import { photos, events, users } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { uploadToS3, generatePhotoKey, deleteFromS3, getSignedUploadUrl, deriveThumbKey } from '@/lib/s3';
import { uploadLimitBytes, normalizePlanName, photoLimitPerEvent } from '@/lib/plans';
import { AuthenticationUtils } from '@/lib/utils/auth';
import { FileOperationUtils } from '@/lib/utils/files';
import { withDatabaseErrorHandling } from '@/lib/utils/database';
import { ValidationUtils, bulkPhotoActionSchema } from '@/lib/utils/validation';

export async function uploadPhotosAction(formData: FormData) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

    const eventId = parseInt(formData.get('eventId') as string);
    const files = formData.getAll('photos') as File[];
    if (!eventId || isNaN(eventId)) throw new Error('Invalid event ID');

  const { getEventById } = await import('@/lib/db/queries');
  const event = await getEventById(eventId);
  if (!event) throw new Error('Event not found');
  if (event.createdBy !== user.id) throw new Error('You do not have permission to upload photos to this event');
  if (files.length === 0) throw new Error('No files selected');

  const host = await db.query.users.findFirst({ where: eq(users.id, event.createdBy) });

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
    return withDatabaseErrorHandling(async () => {
      const user = await AuthenticationUtils.requireAuth();
      const photoId = AuthenticationUtils.extractPhotoId(formData);

      const photoRecord = await db.query.photos.findFirst({ where: eq(photos.id, photoId) });
      if (!photoRecord) throw new Error('Photo not found');
        // Fetch event to validate ownership / permissions
        const eventRecord = await db.query.events.findFirst({ where: eq(events.id, photoRecord.eventId) });
        if (!eventRecord) throw new Error('Event not found');

        // Determine permission: uploader, event owner, or super admin
        const { isSuperAdminUser } = await import('@/lib/auth/admin');
        const isUploader = photoRecord.uploadedBy === user.id;
        const isEventOwner = eventRecord.createdBy === user.id;
        const isSuperAdmin = isSuperAdminUser(user as any);
        if (!(isUploader || isEventOwner || isSuperAdmin)) {
          throw new Error('You do not have permission to delete this photo');
        }

      // Delete the physical file
      await FileOperationUtils.deleteFile(photoRecord.filePath);

        // Also attempt to delete derived thumbnail if it exists
        try {
          const key = photoRecord.filePath.startsWith('s3:') ? photoRecord.filePath.slice(3) : photoRecord.filePath;
          const thumbKey = deriveThumbKey(key);
          if (thumbKey) {
            await FileOperationUtils.deleteFile(`s3:${thumbKey}`);
          }
        } catch (err) {
          // Non-fatal; log for observability but don't block deletion
          console.warn('Thumbnail deletion failed (non-fatal):', err);
        }

      // Delete the database record
      await db.delete(photos).where(eq(photos.id, photoId));

        // Log activity
        try {
          const { logActivity } = await import('@/lib/db/queries');
          await logActivity({
            userId: user.id,
            action: 'DELETE_PHOTO',
            detail: `Deleted photo '${photoRecord.originalFilename || photoRecord.filename}' (id ${photoId}) from event ${photoRecord.eventId}`,
          });
        } catch (e) {
          console.warn('Failed to log DELETE_PHOTO activity:', e);
        }

        // Revalidate affected pages (best-effort)
        try {
          const { revalidatePath } = await import('next/cache');
          if (eventRecord.eventCode) {
            revalidatePath(`/dashboard/events/${eventRecord.eventCode}`);
            revalidatePath(`/events/${eventRecord.eventCode}`);
          }
        } catch (e) {
          // Ignore revalidation failures
        }
      
      return { success: true };
    }, 'deletePhotoAction');
  }

  export async function deletePhotosBulkAction(formData: FormData) {
    return withDatabaseErrorHandling(async () => {
      const user = await AuthenticationUtils.requireAuth();
      
      // Validate input with Zod schema
      const { eventId, photoIds } = ValidationUtils.validateFormData(formData, bulkPhotoActionSchema, (data) => ({
        eventId: parseInt(data.eventId as string),
        photoIds: JSON.parse(data.photoIds as string).map((id: any) => parseInt(id)),
      }));

      const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
      if (!event) throw new Error('Event not found');
      if (event.createdBy !== user.id) {
        throw new Error('You do not have permission to delete photos for this event');
      }

      const target = await db.query.photos.findMany({
        where: and(eq(photos.eventId, eventId), inArray(photos.id, photoIds)),
        columns: { id: true, filePath: true }
      });
      
      if (target.length === 0) return { count: 0 };

      // Delete all files concurrently
      const filePaths = target.map(p => p.filePath);
      await FileOperationUtils.deleteFiles(filePaths);

      // Delete database records
      const targetIds = target.map((p) => p.id);
      await db.delete(photos).where(inArray(photos.id, targetIds));

      // Revalidate pages
      try {
        const { revalidatePath } = await import('next/cache');
        revalidatePath(`/dashboard/events/${event.eventCode}`);
        revalidatePath(`/events/${event.eventCode}`);
      } catch {
        // Revalidation failure is not critical
      }
      
      return { count: targetIds.length };
    }, 'deletePhotosBulkAction');
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
