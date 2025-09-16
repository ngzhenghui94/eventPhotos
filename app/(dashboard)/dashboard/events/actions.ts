'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { events } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, and, desc, sql } from 'drizzle-orm';
import { eventLimit, normalizePlanName } from '@/lib/plans';
import { redis } from '@/lib/upstash';

const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(200, 'Event name too long'),
  description: z.string().optional(),
  date: z.string().min(1, 'Event date is required'),
  location: z.string().optional(),
  category: z.string().min(1, 'Category is required').max(32),
  isPublic: z.boolean().optional(),
  allowGuestUploads: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
});

export async function createEventAction(formData: FormData) {
  const user = await getUser();
  if (!user) {
  redirect('/api/auth/google');
  }

  // Get user's plan and event count
  const planName = normalizePlanName(user.planName);
  const currentEvents = await db.query.events.findMany({
    where: eq(events.createdBy, user.id),
    columns: { id: true }
  });
  const currentCount = currentEvents.length;

  // Enforce event creation limit based on plan
  const limit = eventLimit(planName);
  if (limit !== null && currentCount >= limit) {
    redirect(`/dashboard/events/new?error=${encodeURIComponent('Event creation limit reached for your plan. Upgrade to create more events.')}`);
  }

  const data = {
    name: formData.get('name') as string,
    description: formData.get('description') as string || '',
    date: formData.get('date') as string,
    location: formData.get('location') as string || '',
    category: (formData.get('category') as string) || 'General',
    isPublic: formData.get('isPublic') === 'on',
    allowGuestUploads: formData.get('allowGuestUploads') === 'on',
    requireApproval: formData.get('requireApproval') === 'on',
  };

  const result = createEventSchema.safeParse(data);
  if (!result.success) {
    throw new Error(result.error.errors[0].message);
  }
  // Idempotency key based on user + name + date (5s window)
  const safeName = (result.data.name || '').trim().toUpperCase();
  const safeDate = new Date(result.data.date).toISOString();
  const idemKey = `idem:event:create:${user.id}:${safeName}:${safeDate}`;
  const acquired = await redis.set(idemKey, '1', { nx: true, ex: 5 });

  if (!acquired) {
    // Another in-flight create with same payload; try to find the latest and redirect
    const existing = await db.query.events.findFirst({
      where: and(eq(events.name, result.data.name), eq(events.createdBy, user.id)),
      orderBy: (e, { desc }) => desc(e.createdAt),
      columns: { eventCode: true },
    });
    if (existing) return redirect(`/dashboard/events/${existing.eventCode}`);
    throw new Error('Event creation already in progress. Please wait a moment.');
  }

  // Generate unique codes
  const eventCode = generateEventCode(); // 8 chars
  const accessCode = generateAccessCode(); // 6 chars

  // Safe to insert now
  const [newEvent] = await db
    .insert(events)
    .values({
      name: result.data.name,
      description: (result.data.description ?? '').toString(),
      date: new Date(result.data.date),
      location: (result.data.location ?? '').toString(),
      eventCode,
      accessCode,
      createdBy: user.id,
      category: result.data.category,
      isPublic: result.data.isPublic || false,
      allowGuestUploads: result.data.allowGuestUploads !== false,
      requireApproval: result.data.requireApproval || false,
    })
    .onConflictDoNothing({ target: events.eventCode })
    .returning({ id: events.id, eventCode: events.eventCode })
    .catch((error) => {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event. Please try again.');
    });
  if (!newEvent) {
    // Conflict occurred or no row returned; attempt to find a recent event matching name/creator
    const existing = await db.query.events.findFirst({
      where: and(eq(events.name, result.data.name), eq(events.createdBy, user.id)),
      orderBy: (e, { desc }) => desc(e.createdAt),
      columns: { eventCode: true }
    });
    if (existing) return redirect(`/dashboard/events/${existing.eventCode}`);
    throw new Error('Failed to create event. Please try again.');
  }

  redirect(`/dashboard/events/${newEvent.eventCode}`);
  return;
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