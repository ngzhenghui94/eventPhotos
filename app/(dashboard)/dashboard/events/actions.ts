'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { events, teamMembers } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';

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

export async function createEventAction(formData: FormData) {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  // Get user's team
  const userTeam = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    columns: { teamId: true }
  });

  if (!userTeam) {
    throw new Error('User is not part of a team');
  }

  const data = {
    name: formData.get('name') as string,
    description: formData.get('description') as string || '',
    date: formData.get('date') as string,
    location: formData.get('location') as string || '',
    isPublic: formData.get('isPublic') === 'on',
    allowGuestUploads: formData.get('allowGuestUploads') === 'on',
    requireApproval: formData.get('requireApproval') === 'on',
  };

  const result = createEventSchema.safeParse(data);
  if (!result.success) {
    throw new Error(result.error.errors[0].message);
  }

  // Generate unique codes
  const eventCode = generateEventCode(); // 8 chars
  const accessCode = generateAccessCode(); // 6 chars
  
  const [newEvent] = await db
    .insert(events)
    .values({
      name: result.data.name,
      // Some databases currently enforce NOT NULL; use empty string instead of null
      description: (result.data.description ?? '').toString(),
      date: new Date(result.data.date),
      location: (result.data.location ?? '').toString(),
      eventCode,
      accessCode,
      teamId: userTeam.teamId,
      createdBy: user.id,
      isPublic: result.data.isPublic || false,
      allowGuestUploads: result.data.allowGuestUploads !== false, // Default to true
      requireApproval: result.data.requireApproval || false,
    })
  .returning({ id: events.id, eventCode: events.eventCode })
    .catch((error) => {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event. Please try again.');
    });

  redirect(`/dashboard/events/${newEvent.eventCode}`);
}

// Helper function to generate unique access codes
function generateAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to generate 8-char event codes
function generateEventCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}