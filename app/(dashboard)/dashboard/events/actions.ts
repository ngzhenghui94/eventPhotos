'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/drizzle';
import { events, teamMembers } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, and, desc, sql } from 'drizzle-orm';

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
  redirect('/api/auth/google');
  }

  // Get user's team and plan
  const userTeam = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: { team: { columns: { id: true, planName: true } } },
    columns: { teamId: true }
  });

  if (!userTeam || !userTeam.team) {
    throw new Error('User is not part of a team');
  }

  // Get current event count for team
  const currentEvents = await db.query.events.findMany({
    where: eq(events.teamId, userTeam.teamId),
    columns: { id: true }
  });
  const currentCount = currentEvents.length;

  // Enforce event creation limit based on plan
  // Import canCreateAnotherEvent from lib/plans
  // (Assume import is already present or add if missing)
  // @ts-ignore
  const { canCreateAnotherEvent } = await import('@/lib/plans');
  const planName = userTeam.team.planName;
  if (!canCreateAnotherEvent(planName, currentCount)) {
    // Redirect to new event page with error param for toast
    redirect(`/dashboard/events/new?error=${encodeURIComponent('Event creation limit reached for your plan. Upgrade to create more events.')}`);
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

  // Server-side duplicate submission protection:
  // If the same user/team recently created an event with the same name, redirect to it.
  // Acquire a lightweight per-team advisory lock to serialize creation requests
  const LOCK_KEY_SQL = sql`hashtext(${`create_event_team_${userTeam.teamId}`})`;
  let gotLock = false;
  const lockStart = Date.now();
  try {
    // Try for up to ~3 seconds to acquire the lock
    while (!gotLock && Date.now() - lockStart < 3000) {
      try {
        const res: any = await db.execute(sql`SELECT pg_try_advisory_lock(${LOCK_KEY_SQL}) AS got`);
        gotLock = res?.rows?.[0]?.got ?? res?.rows?.[0]?.pg_try_advisory_lock ?? false;
      } catch (e) {
        console.error('Lock acquire error:', e);
      }
      if (!gotLock) await new Promise((r) => setTimeout(r, 150));
    }

    if (gotLock) {
      // While holding the lock, check for a recent event with same name/team/creator
      const recent = await db.query.events.findFirst({
        where: and(eq(events.teamId, userTeam.teamId), eq(events.name, result.data.name), eq(events.createdBy, user.id)),
        orderBy: (e, { desc }) => desc(e.createdAt),
        columns: { id: true, eventCode: true, createdAt: true }
      });
      if (recent) {
        const createdAt = new Date(recent.createdAt).getTime();
        if (Date.now() - createdAt < 15000) {
          // Recent match found within 15s — treat as duplicate submission
          redirect(`/dashboard/events/${recent.eventCode}`);
          return;
        }
      }

      // Safe to insert now while holding the lock
      const [newEvent] = await db
        .insert(events)
        .values({
          name: result.data.name,
          description: (result.data.description ?? '').toString(),
          date: new Date(result.data.date),
          location: (result.data.location ?? '').toString(),
          eventCode,
          accessCode,
          teamId: userTeam.teamId,
          createdBy: user.id,
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
        // Conflict occurred or no row returned; attempt to find a recent event matching name/team/creator
        const existing = await db.query.events.findFirst({
          where: and(eq(events.teamId, userTeam.teamId), eq(events.name, result.data.name), eq(events.createdBy, user.id)),
          orderBy: (e, { desc }) => desc(e.createdAt),
          columns: { eventCode: true }
        });
        if (existing) return redirect(`/dashboard/events/${existing.eventCode}`);
        throw new Error('Failed to create event. Please try again.');
      }

      redirect(`/dashboard/events/${newEvent.eventCode}`);
      return;
    }

    // If we couldn't get the lock, fall back to best-effort creation (client-side should prevent spam)
    const [newEventFallback] = await db
      .insert(events)
      .values({
        name: result.data.name,
        description: (result.data.description ?? '').toString(),
        date: new Date(result.data.date),
        location: (result.data.location ?? '').toString(),
        eventCode,
        accessCode,
        teamId: userTeam.teamId,
        createdBy: user.id,
        isPublic: result.data.isPublic || false,
        allowGuestUploads: result.data.allowGuestUploads !== false,
        requireApproval: result.data.requireApproval || false,
      })
      .onConflictDoNothing({ target: events.eventCode })
      .returning({ id: events.id, eventCode: events.eventCode })
      .catch((error) => {
        console.error('Fallback create error:', error);
        throw new Error('Failed to create event. Please try again.');
      });

    if (!newEventFallback) {
      const existing = await db.query.events.findFirst({
        where: and(eq(events.teamId, userTeam.teamId), eq(events.name, result.data.name), eq(events.createdBy, user.id)),
        orderBy: (e, { desc }) => desc(e.createdAt),
        columns: { eventCode: true }
      });
      if (existing) return redirect(`/dashboard/events/${existing.eventCode}`);
      throw new Error('Failed to create event. Please try again.');
    }

    redirect(`/dashboard/events/${newEventFallback.eventCode}`);
    return;
  } finally {
    if (gotLock) {
      try {
        await db.execute(sql`SELECT pg_advisory_unlock(${LOCK_KEY_SQL})`);
      } catch (e) {
        console.error('Lock release error:', e);
      }
    }
  }
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