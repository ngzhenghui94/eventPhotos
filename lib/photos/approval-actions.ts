'use server';

import { db } from '@/lib/db/drizzle';
import { photos, ActivityType } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { AuthenticationUtils } from '@/lib/utils/auth';
import { FileOperationUtils } from '@/lib/utils/files';
import { withDatabaseErrorHandling } from '@/lib/utils/database';

export async function approvePhotoAction(formData: FormData) {
  return withDatabaseErrorHandling(async () => {
    const user = await AuthenticationUtils.requireAuth();
    const photoId = AuthenticationUtils.extractPhotoId(formData);
    const eventId = AuthenticationUtils.extractEventId(formData);

    // Verify photo exists
    const photo = await db.query.photos.findFirst({
      where: eq(photos.id, photoId)
    });
    
    if (!photo) {
      throw new Error('Photo not found');
    }

    await db.update(photos)
      .set({ isApproved: true })
      .where(eq(photos.id, photoId));

    // Revalidate pages
    revalidatePath('/dashboard/events');
    revalidatePath('/events');
    
    return { success: true };
  }, 'approvePhotoAction');
}

export async function rejectPhotoAction(formData: FormData) {
  return withDatabaseErrorHandling(async () => {
    const user = await AuthenticationUtils.requireAuth();
    const photoId = AuthenticationUtils.extractPhotoId(formData);
    const eventId = AuthenticationUtils.extractEventId(formData);

    // Verify photo exists
    const photo = await db.query.photos.findFirst({
      where: eq(photos.id, photoId)
    });
    
    if (!photo) {
      throw new Error('Photo not found');
    }

    // Delete the physical file
    await FileOperationUtils.deleteFile(photo.filePath);

    // Delete the database record
    await db.delete(photos).where(eq(photos.id, photoId));

    // Revalidate pages
    revalidatePath('/dashboard/events');
    revalidatePath('/events');
    
    return { success: true };
  }, 'rejectPhotoAction');
}