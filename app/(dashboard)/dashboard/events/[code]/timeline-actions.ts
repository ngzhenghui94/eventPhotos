import { z } from 'zod';
import {
  createEventTimelineEntry,
  updateEventTimelineEntry,
  deleteEventTimelineEntry,
  getUser,
} from '@/lib/db/queries';
import { validatedActionWithUser } from '@/lib/auth/middleware';

const TimelineEntrySchema = z.object({
  eventId: z.number(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  location: z.string().max(255).optional(),
  time: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date/time'),
  sortOrder: z.number().optional(),
});

export const addTimelineEntry = validatedActionWithUser(
  TimelineEntrySchema,
  async (data, _formData, user) => {
    // Only event owner can add
    // TODO: verify ownership
    console.log('[Timeline Debug] Received data:', data);
    const entry = await createEventTimelineEntry({
      eventId: data.eventId,
      title: data.title,
      description: data.description,
      location: data.location,
      time: new Date(data.time),
    });
    console.log('[Timeline Debug] DB insert result:', entry);
    return { success: 'Timeline entry added', entry };
  }
);

export const updateTimelineEntry = validatedActionWithUser(
  TimelineEntrySchema.extend({ id: z.number() }),
  async (data, _formData, user) => {
    // Only event owner can update
    // TODO: verify ownership
    const entry = await updateEventTimelineEntry(data.id, {
      title: data.title,
      description: data.description,
      location: data.location,
      time: new Date(data.time),
    });
    return { success: 'Timeline entry updated', entry };
  }
);

export const deleteTimelineEntry = validatedActionWithUser(
  z.object({ id: z.number() }),
  async (data, _formData, user) => {
    // Only event owner can delete
    // TODO: verify ownership
    await deleteEventTimelineEntry(data.id);
    return { success: 'Timeline entry deleted' };
  }
);
