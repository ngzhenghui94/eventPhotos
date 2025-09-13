import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { events, ActivityType, eventTimelines } from '@/lib/db/schema';
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { eq, sql } from 'drizzle-orm';
// import { canCreateAnotherEvent, getTeamPlanName } from '@/lib/plans'; // Teams feature removed

// Teams feature removed

// Create Event Action
const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(200, 'Event name too long'),
  description: z.string().optional(),
  date: z.string().min(1, 'Event date is required'),
  location: z.string().optional(),
  isPublic: z.boolean().optional(),
  allowGuestUploads: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
});

export const createEvent = validatedActionWithUser(
  createEventSchema,
  async (data, _, user) => {
    // Generate codes
    const eventCode = generateEventCode();
    const accessCode = generateAccessCode();
    try {
      const [newEvent] = await db.insert(events).values({
        name: data.name,
        description: (data.description ?? '').toString(),
        date: new Date(data.date),
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
          date: data.date ? new Date(data.date) : existing.date,
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
  // Teams feature removed

    try {
      // Delete related timelines first to satisfy FK constraints
      await db.delete(eventTimelines).where(eq(eventTimelines.eventId, data.eventId));
      await db.delete(events).where(eq(events.id, data.eventId));
      return { success: 'Event deleted successfully' };
    } catch (error) {
      console.error('Error deleting event:', error);
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