'use server';

import { db } from '@/lib/db/drizzle';
import { photos, teamMembers, ActivityType } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { deleteFromS3 } from '@/lib/s3';

export async function approvePhotoAction(formData: FormData) {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const photoId = parseInt(formData.get('photoId') as string);
  const eventId = parseInt(formData.get('eventId') as string);
  
  if (!photoId || isNaN(photoId)) {
    throw new Error('Invalid photo ID');
  }

  // Verify user has permission to approve photos
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

  // Check if user is part of the team that owns this event
  const userTeam = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    columns: { teamId: true }
  });

  if (!userTeam || userTeam.teamId !== photo.event.teamId) {
    throw new Error('You do not have permission to approve photos for this event');
  }

  await db.update(photos)
    .set({ isApproved: true })
    .where(eq(photos.id, photoId));

  // Revalidate pages
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/guest/${photo.event.accessCode}`);
}

export async function rejectPhotoAction(formData: FormData) {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const photoId = parseInt(formData.get('photoId') as string);
  const eventId = parseInt(formData.get('eventId') as string);
  
  if (!photoId || isNaN(photoId)) {
    throw new Error('Invalid photo ID');
  }

  // Use the existing deletePhotoAction logic but with approval check
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

  // Check if user is part of the team that owns this event
  const userTeam = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    columns: { teamId: true }
  });

  if (!userTeam || userTeam.teamId !== photo.event.teamId) {
    throw new Error('You do not have permission to reject photos for this event');
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

  // Revalidate pages
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/guest/${photo.event.accessCode}`);
}