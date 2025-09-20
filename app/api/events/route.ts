import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { events, ActivityType } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

import { eq } from 'drizzle-orm';
import { photos } from '@/lib/db/schema';
import { sql, inArray } from 'drizzle-orm';
import { cacheWrap } from '@/lib/utils/cache';
import { redis } from '@/lib/upstash';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

  const data = await cacheWrap(`user:${user.id}:events:list:v2`, 300, async () => {
      // Fetch events created by the user, explicitly select all columns
      const userEvents = await db
        .select({
          id: events.id,
          eventCode: events.eventCode,
          accessCode: events.accessCode,
          name: events.name,
          description: events.description,
          date: events.date,
          location: events.location,
          category: events.category,
          isPublic: events.isPublic,
          allowGuestUploads: events.allowGuestUploads,
          requireApproval: events.requireApproval,
          createdAt: events.createdAt,
          createdBy: events.createdBy,
        })
        .from(events)
        .where(eq(events.createdBy, user.id));

      const eventIds = userEvents.map((ev) => ev.id);
      const photoCounts: Record<number, number> = {};
      if (eventIds.length > 0) {
        // Try per-event count cache first via MGET
        const keys = eventIds.map((id) => `evt:${id}:photoCount`);
        let cachedCounts: Array<number | null> = [];
        try {
          const res = await (redis as any).mget(...keys);
          cachedCounts = Array.isArray(res) ? (res as Array<number | null>) : [];
        } catch {
          cachedCounts = [];
        }

        const missingIds: number[] = [];
        for (let i = 0; i < eventIds.length; i++) {
          const id = eventIds[i];
          const val = cachedCounts[i];
          if (typeof val === 'number') {
            photoCounts[id] = val;
          } else {
            missingIds.push(id);
          }
        }

        if (missingIds.length > 0) {
          const rows = await db
            .select({ eventId: photos.eventId, count: sql<number>`count(*)` })
            .from(photos)
            .where(inArray(photos.eventId, missingIds))
            .groupBy(photos.eventId);
          for (const row of rows) {
            const c = Number(row.count) || 0;
            photoCounts[row.eventId] = c;
            // Prime cache for each event's photoCount (TTL 2 min)
            try {
              await redis.set(`evt:${row.eventId}:photoCount`, c, { ex: 120 });
            } catch {}
          }
          // Any events without rows have zero photos
          for (const id of missingIds) {
            if (!(id in photoCounts)) {
              photoCounts[id] = 0;
              try { await redis.set(`evt:${id}:photoCount`, 0, { ex: 120 }); } catch {}
            }
          }
        }
      }

      // Build result
      const result = userEvents.map((ev) => ({
        id: ev.id,
        eventCode: ev.eventCode,
        accessCode: ev.accessCode,
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
        photoCount: photoCounts[ev.id] || 0,
      }));
      return result;
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

  // Teams feature removed; event creation is disabled
  return Response.json({ error: 'Event creation is disabled' }, { status: 403 });
  } catch (error) {
    console.error('Error creating event:', error);
    return Response.json({ error: 'Failed to create event' }, { status: 500 });
  }
}