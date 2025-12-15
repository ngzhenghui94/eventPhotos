import { NextRequest } from 'next/server';
import { getUser, getUserEvents } from '@/lib/db/queries';
import { cacheWrap } from '@/lib/utils/cache';
import { USER_EVENTS_LIST_TTL_SECONDS } from '@/lib/config/cache';
import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { events } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { eventLimit, normalizePlanName } from '@/lib/plans';
import { redis } from '@/lib/upstash';
import { generateAccessCode, generateEventCode } from '@/lib/events/actions';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

  const data = await cacheWrap(`user:${user.id}:events:list:v3`, USER_EVENTS_LIST_TTL_SECONDS, async () => {
      // Fetch all events the user owns or is a member of, including photo counts
      const rows = await getUserEvents(user.id);
      return rows;
    });

    return Response.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching events:', error);
    return Response.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schema = z.object({
      name: z.string().min(1).max(200),
      description: z.string().optional().nullable(),
      // `CreateEventModal` sends `eventDate` (YYYY-MM-DD). Allow both.
      eventDate: z.string().optional().nullable(),
      date: z.string().optional().nullable(),
      location: z.string().optional().nullable(),
      category: z.string().optional().nullable(),
      isPublic: z.boolean().optional(),
      allowGuestUploads: z.boolean().optional(),
      requireApproval: z.boolean().optional(),
    });
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const plan = normalizePlanName(user.planName);
    const limit = eventLimit(plan);
    if (limit !== null) {
      const current = await db.query.events.findMany({
        where: eq(events.createdBy, user.id),
        columns: { id: true },
      });
      if (current.length >= limit) {
        return Response.json({ error: 'Event creation limit reached for your plan.' }, { status: 403 });
      }
    }

    const dateStr = (parsed.data.date || parsed.data.eventDate || null)?.toString().trim() || null;
    const dateVal = dateStr ? new Date(dateStr) : null;
    if (dateStr && Number.isNaN(dateVal!.getTime())) {
      return Response.json({ error: 'Invalid event date' }, { status: 400 });
    }

    // Idempotency guard (5s) per user + name + date
    const safeName = (parsed.data.name || '').trim().toUpperCase();
    const safeDate = dateVal ? dateVal.toISOString() : 'NO_DATE';
    const idemKey = `idem:event:create:${user.id}:${safeName}:${safeDate}`;
    const acquired = await redis.set(idemKey, '1', { nx: true, ex: 5 }).catch(() => null);
    if (!acquired) {
      const existing = await db.query.events.findFirst({
        where: eq(events.createdBy, user.id),
        orderBy: (e, { desc }) => desc(e.createdAt),
        columns: { id: true, eventCode: true },
      });
      if (existing) return Response.json(existing, { status: 200 });
      return Response.json({ error: 'Event creation already in progress. Please wait.' }, { status: 429 });
    }

    const eventCode = generateEventCode();
    const accessCode = generateAccessCode();
    const [created] = await db
      .insert(events)
      .values({
        name: parsed.data.name,
        description: (parsed.data.description ?? '').toString(),
        date: dateVal,
        location: (parsed.data.location ?? '').toString(),
        category: (parsed.data.category ?? 'General').toString(),
        eventCode,
        accessCode,
        createdBy: user.id,
        isPublic: !!parsed.data.isPublic,
        allowGuestUploads: parsed.data.allowGuestUploads !== false,
        requireApproval: !!parsed.data.requireApproval,
      })
      .returning();

    // Best-effort: invalidate event list cache
    try { await redis.del(`user:${user.id}:events:list:v3`); } catch {}
    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return Response.json({ error: 'Failed to create event' }, { status: 500 });
  }
}