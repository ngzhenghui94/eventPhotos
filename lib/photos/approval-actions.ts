'use server';

import { db } from '@/lib/db/drizzle';
import { photos, ActivityType } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { deleteFromS3 } from '@/lib/s3';

export async function approvePhotoAction(formData: FormData) {
  const user = await getUser();
  if (!user) {
  redirect('/api/auth/google');
  }

  const photoId = parseInt(formData.get('photoId') as string);
  const eventId = parseInt(formData.get('eventId') as string);
  
  if (!photoId || isNaN(photoId)) {
    throw new Error('Invalid photo ID');
  }

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
  // Teams feature removed; eventCode may not exist
}

export async function rejectPhotoAction(formData: FormData) {
  const user = await getUser();
  if (!user) {
  redirect('/api/auth/google');
  }

  const photoId = parseInt(formData.get('photoId') as string);
  const eventId = parseInt(formData.get('eventId') as string);
  
  if (!photoId || isNaN(photoId)) {
    throw new Error('Invalid photo ID');
  }

  // Verify photo exists
  const photo = await db.query.photos.findFirst({
    where: eq(photos.id, photoId)
  });
  if (!photo) {
    throw new Error('Photo not found');
  }

  // Delete the photo (S3 or local fallback)
  try {
    if (photo.filePath?.startsWith('s3:')) {
      const key = photo.filePath.replace(/^s3:/, '');
      await deleteFromS3(key);
    } else if (photo.filePath) {
      const fs = require('fs').promises;
      const { join } = require('path');
      const filePath = join(process.cwd(), 'public', photo.filePath);
      await fs.unlink(filePath);
    }
  } catch (fileError) {
    console.error('Error deleting file:', fileError);
  }

  await db.delete(photos).where(eq(photos.id, photoId));

  // Revalidate pages (Teams feature removed; eventCode unavailable)
  revalidatePath(`/dashboard/events`);
  revalidatePath(`/events`);
}