import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { events, ActivityType } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

import { eq } from 'drizzle-orm';
import { photos } from '@/lib/db/schema';
import { sql, inArray } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch events created by the user, explicitly select all columns
    const userEvents = await db.select({
      id: events.id,
      eventCode: events.eventCode,
      name: events.name,
      description: events.description,
      date: events.date,
      location: events.location,
      category: events.category,
      isPublic: events.isPublic,
      allowGuestUploads: events.allowGuestUploads,
      requireApproval: events.requireApproval,
      createdAt: events.createdAt,
      createdBy: events.createdBy
    }).from(events)
      .where(eq(events.createdBy, user.id));

    // Fetch photo counts for all events in one query
    const eventIds = userEvents.map(ev => ev.id);
    let photoCounts: Record<number, number> = {};
    if (eventIds.length > 0) {
      const photoRows = await db
        .select({ eventId: photos.eventId, count: sql<number>`count(*)` })
        .from(photos)
        .where(inArray(photos.eventId, eventIds))
        .groupBy(photos.eventId);
      photoRows.forEach(row => {
        photoCounts[row.eventId] = Number(row.count) || 0;
      });
    }

    // Add photoCount, ownerName, and category
    const result = userEvents.map(ev => ({
      id: ev.id,
      eventCode: ev.eventCode,
      name: ev.name,
      description: ev.description,
      date: ev.date,
      location: ev.location,
      category: ev.category,
      isPublic: ev.isPublic,
      allowGuestUploads: ev.allowGuestUploads,
      requireApproval: ev.requireApproval,
      createdAt: ev.createdAt,
      ownerName: user.name,
      ownerId: user.id,
      photoCount: photoCounts[ev.id] || 0
    }));
  // Removed debug log
  return Response.json(result, { status: 200 });
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

  // Teams feature removed; event creation is disabled
  return Response.json({ error: 'Event creation is disabled' }, { status: 403 });
  } catch (error) {
    console.error('Error creating event:', error);
    return Response.json({ error: 'Failed to create event' }, { status: 500 });
  }
}