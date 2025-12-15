import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { events, ActivityType, eventTimelines, photos } from '@/lib/db/schema';
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { eq, sql, and, desc } from 'drizzle-orm';
import { redis } from '@/lib/upstash';
import { deleteManyFromS3, deriveThumbKey } from '@/lib/s3';
// import { canCreateAnotherEvent, getTeamPlanName } from '@/lib/plans'; // Teams feature removed

// Teams feature removed

// Create Event Action
const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(200, 'Event name too long'),
  description: z.string().optional(),
  date: z.string().optional(),
  location: z.string().optional(),
  isPublic: z.boolean().optional(),
  allowGuestUploads: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
});

export const createEvent = validatedActionWithUser(
  createEventSchema,
  async (data, _, user) => {
    // Idempotency guard (5s) per user + name + date
    const safeName = (data.name || '').trim().toUpperCase();
    const safeDate = data.date ? new Date(data.date).toISOString() : 'NO_DATE';
    const idemKey = `idem:event:create:${user.id}:${safeName}:${safeDate}`;
    const acquired = await redis.set(idemKey, '1', { nx: true, ex: 5 });
    if (!acquired) {
      const existing = await db.query.events.findFirst({
        where: and(eq(events.name, data.name), eq(events.createdBy, user.id)),
        orderBy: (e, { desc }) => desc(e.createdAt),
        columns: { id: true },
      });
      if (existing) return { success: 'Event already created', eventId: existing.id };
      return { error: 'Event creation already in progress. Please wait.' };
    }

    // Generate codes
    const eventCode = generateEventCode();
    const accessCode = generateAccessCode();
    try {
      const [newEvent] = await db.insert(events).values({
        name: data.name,
        description: (data.description ?? '').toString(),
        date: data.date ? new Date(data.date) : null,
        location: (data.location ?? '').toString(),
        eventCode,
        accessCode,
        createdBy: user.id,
        isPublic: data.isPublic || false,
        allowGuestUploads: data.allowGuestUploads !== false, // Default to true
        requireApproval: data.requireApproval || false,
      }).returning();
      return { success: 'Event created successfully', eventId: newEvent.id };
    } catch (error) {
      console.error('Error creating event:', error);
      return { error: 'Failed to create event. Please try again.' };
    }
  }
);

// Update Event Action
const updateEventSchema = z.object({
  eventId: z.string().transform(Number),
  name: z.string().min(1, 'Event name is required').max(200, 'Event name too long'),
  description: z.string().optional(),
  date: z.string().optional(),
  location: z.string().optional(),
  isPublic: z.boolean().optional(),
  allowGuestUploads: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
});

export const updateEvent = validatedActionWithUser(
  updateEventSchema,
  async (data, _, user) => {
    // Load the event to verify ownership and get current values
    const existing = await db.query.events.findFirst({ where: eq(events.id, data.eventId) });
    if (!existing) {
      return { error: 'Event not found' };
    }

    // Only the event creator can edit (teams feature removed)
    const isCreator = existing.createdBy === user.id;
    if (!isCreator) {
      return { error: 'You do not have permission to edit this event.' };
    }

    try {
      await db.update(events)
        .set({
          name: data.name ?? existing.name,
          description: (data.description ?? existing.description ?? '').toString(),
          date: data.date ? new Date(data.date) : (existing.date ?? null),
          location: (data.location ?? existing.location ?? '').toString(),
          isPublic: typeof data.isPublic === 'boolean' ? data.isPublic : existing.isPublic,
          allowGuestUploads: typeof data.allowGuestUploads === 'boolean' ? data.allowGuestUploads : existing.allowGuestUploads,
          requireApproval: typeof data.requireApproval === 'boolean' ? data.requireApproval : existing.requireApproval,
          updatedAt: new Date(),
        })
        .where(eq(events.id, data.eventId));

      return { success: 'Event updated successfully' };
    } catch (error) {
      console.error('Error updating event:', error);
      return { error: 'Failed to update event. Please try again.' };
    }
  }
);

// Delete Event Action
const deleteEventSchema = z.object({
  eventId: z.string().transform(Number),
});

export const deleteEvent = validatedActionWithUser(
  deleteEventSchema,
  async (data, _, user) => {
  // Note: `validatedActionWithUser` already verifies user is logged in.
  // Only the Host (event creator) can delete an event.
    const existing = await db.query.events.findFirst({
      where: eq(events.id, data.eventId),
      columns: { createdBy: true },
    });

    if (!existing) {
      return { error: 'Event not found.' };
    }

    if (existing.createdBy !== user.id) {
      return { error: 'You do not have permission to delete this event.' };
    }

    try {
      // 1. Find all photos associated with the event
      const eventPhotos = await db.query.photos.findMany({
        where: eq(photos.eventId, data.eventId),
        columns: { filePath: true },
      });

      // 2. Collect all S3 keys for original photos and their thumbnails
      const s3KeysToDelete = eventPhotos.flatMap(p => [
        p.filePath,
        deriveThumbKey(p.filePath, 'sm'),
        deriveThumbKey(p.filePath, 'md'),
      ]);

      // 3. Delete photos from S3 in a batch
      if (s3KeysToDelete.length > 0) {
        await deleteManyFromS3(s3KeysToDelete);
      }

      // 4. Delete all related DB records (photos, timelines, and the event itself)
      // Drizzle doesn't have cascade deletes, so we do it manually.
      await db.delete(photos).where(eq(photos.eventId, data.eventId));
      await db.delete(eventTimelines).where(eq(eventTimelines.eventId, data.eventId));
      await db.delete(events).where(eq(events.id, data.eventId));

      return { success: 'Event and all associated photos have been deleted successfully.' };
    } catch (error) {
      console.error('Error deleting event and its assets:', error);
      return { error: 'Failed to delete event. Please try again.' };
    }
  }
);

// Helper function to generate unique access codes
export function generateAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateEventCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}