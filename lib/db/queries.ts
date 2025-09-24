import { desc, and, eq, isNull, inArray, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from './drizzle';
import { activityLogs, users, events, photos, eventTimelines, ActivityType, eventMessages } from './schema';
import { verifyToken } from '@/lib/auth/session';
// ============================================================================
// EVENT TIMELINE MANAGEMENT
// ============================================================================

import type { EventTimeline, NewEventTimeline } from './schema';
import { redis } from '@/lib/upstash';
import { withDatabaseErrorHandling, findFirst, validateRequiredFields } from '@/lib/utils/database';
import { cacheWrap, versionedCacheWrap, getEventVersion, getEventStatsCached, setEventStatsCached } from '@/lib/utils/cache';
import type { EventStats } from '@/lib/types/common';
import { ACCESS_CHECK_TTL_SECONDS } from '@/lib/config/cache';
import { EVENT_TIMELINE_TTL_SECONDS, EVENT_BY_ID_TTL_SECONDS, EVENT_BY_CODE_TTL_SECONDS, EVENT_PHOTOS_TTL_SECONDS } from '@/lib/config/cache';

/**
 * Fetches all timeline entries for an event, ordered by time and sortOrder
 */
export async function getEventTimeline(eventId: number): Promise<EventTimeline[]> {
  return withDatabaseErrorHandling(async () => {
  return cacheWrap(`evt:${eventId}:timeline`, EVENT_TIMELINE_TTL_SECONDS, async () =>
      db.query.eventTimelines.findMany({
        where: eq(eventTimelines.eventId, eventId),
        orderBy: [eventTimelines.time],
      })
    );
  }, 'getEventTimeline');
}

/**
 * Creates a new timeline entry for an event
 */
export async function createEventTimelineEntry(data: NewEventTimeline): Promise<EventTimeline> {
  validateRequiredFields(data, ['eventId', 'title', 'time']);
  return withDatabaseErrorHandling(async () => {
    const [created] = await db.insert(eventTimelines).values(data).returning();
    try { await redis.del(`evt:${data.eventId}:timeline`); } catch {}
    return created;
  }, 'createEventTimelineEntry');
}

/**
 * Updates an existing timeline entry
 */
export async function updateEventTimelineEntry(id: number, data: Partial<NewEventTimeline>): Promise<EventTimeline | null> {
  return withDatabaseErrorHandling(async () => {
    const [updated] = await db.update(eventTimelines)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(eventTimelines.id, id))
      .returning();
    if (updated) {
      try { await redis.del(`evt:${updated.eventId}:timeline`); } catch {}
    }
    return updated || null;
  }, 'updateEventTimelineEntry');
}

/**
 * Deletes a timeline entry
 */
export async function deleteEventTimelineEntry(id: number): Promise<void> {
  return withDatabaseErrorHandling(async () => {
    const existing = await getTimelineEntryById(id);
    await db.delete(eventTimelines).where(eq(eventTimelines.id, id));
    if (existing) {
      try { await redis.del(`evt:${existing.eventId}:timeline`); } catch {}
    }
  }, 'deleteEventTimelineEntry');
}

/**
 * Gets a single timeline entry by id
 */
export async function getTimelineEntryById(id: number): Promise<EventTimeline | null> {
  return withDatabaseErrorHandling(async () => {
    return findFirst(
      db.query.eventTimelines.findMany({
        where: eq(eventTimelines.id, id),
        limit: 1,
      })
    );
  }, 'getTimelineEntryById');
}
// removed duplicate import
import type {
  UserSubscriptionData,
  ActivityLogData,
  EventAccessOptions,
  PhotoData,
  EventWithPhotoCount,
  PaginationOptions,
} from '@/lib/types/common';
// imports moved to top

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Gets the current authenticated user from session
 */
export async function getUser() {
  return withDatabaseErrorHandling(async () => {
    const sessionCookie = (await cookies()).get('session');
    if (!sessionCookie?.value) {
      return null;
    }

    const sessionData = await verifyToken(sessionCookie.value);
    if (!sessionData?.user || typeof sessionData.user.id !== 'number') {
      return null;
    }

    if (new Date(sessionData.expires) < new Date()) {
      return null;
    }

    return findFirst(
      db.query.users.findMany({
        where: and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)),
        limit: 1,
      })
    );
  }, 'getUser');
}


/**
 * Updates user subscription information
 */
export async function updateUserSubscription(data: UserSubscriptionData): Promise<void> {
  validateRequiredFields(data, ['userId', 'planName', 'subscriptionStatus']);
  
  return withDatabaseErrorHandling(async () => {
    await db.update(users)
      .set({
        planName: data.planName,
        subscriptionStatus: data.subscriptionStatus,
        stripeCustomerId: data.stripeCustomerId,
        subscriptionStart: data.subscriptionStart,
        subscriptionEnd: data.subscriptionEnd,
        updatedAt: new Date()
      })
      .where(eq(users.id, data.userId));
  }, 'updateUserSubscription');
}

// ============================================================================
// ACTIVITY LOGGING
// ============================================================================

/**
 * Logs user activity with optional details
 */
export async function logActivity(data: ActivityLogData): Promise<void> {
  validateRequiredFields(data, ['action']);
  
  return withDatabaseErrorHandling(async () => {
    await db.insert(activityLogs).values({
      userId: data.userId ?? null,
      eventId: data.eventId ?? null,
      action: data.action,
      ipAddress: data.ipAddress || null,
      detail: data.detail || null,
    });
  }, 'logActivity');
}

/**
 * Fetches recent activity logs with pagination
 */
export async function getActivityLogs(eventId: number, options: PaginationOptions = {}): Promise<any[]> {
  const { limit = 50, offset = 0 } = options;
  return withDatabaseErrorHandling(async () => {
    return db.query.activityLogs.findMany({
      limit,
      offset,
      orderBy: [desc(activityLogs.timestamp)],
      columns: {
        id: true,
        userId: true,
        action: true,
        detail: true,
        timestamp: true,
        ipAddress: true,
      },
    });
  }, 'getActivityLogs');
}

// ============================================================================
// EVENT MANAGEMENT
// ============================================================================

/**
 * Gets an event by ID with error handling
 */
export async function getEventById(eventId: number) {
  return withDatabaseErrorHandling(async () => {
  return cacheWrap(`evt:id:${eventId}`, EVENT_BY_ID_TTL_SECONDS, async () =>
      findFirst(
        db.query.events.findMany({
          where: eq(events.id, eventId),
          limit: 1,
        })
      )
    );
  }, 'getEventById');
}

/**
 * Gets an event by access code with creator information
 */
export async function getEventByAccessCode(code: string) {
  return withDatabaseErrorHandling(async () => {
    return db.query.events.findFirst({
      where: eq(events.accessCode, code),
      with: {
        createdBy: {
          columns: { id: true, name: true, email: true }
        }
      }
    });
  }, 'getEventByAccessCode');
}

/**
 * Gets an event by event code with creator information
 */
export async function getEventByEventCode(code: string) {
  return withDatabaseErrorHandling(async () => {
  return cacheWrap(`evt:code:${code}`, EVENT_BY_CODE_TTL_SECONDS, async () =>
      db.query.events.findFirst({
        where: eq(events.eventCode, code),
        with: {
          createdBy: {
            columns: { id: true, name: true, email: true, planName: true }
          }
        }
      })
    );
  }, 'getEventByEventCode');
}

/**
 * Checks if a user can access an event with proper validation
 */
export async function canUserAccessEvent(eventId: number, options: EventAccessOptions = {}): Promise<boolean> {
  return withDatabaseErrorHandling(async () => {
    const event = await getEventById(eventId);
    if (!event) return false;
    if (event.isPublic) return true;

    const v = await getEventVersion(eventId);
    let byUser = false;
    let byCode = false;

    if (options.userId) {
      const userKey = `access:evt:${eventId}:v${v}:user:${options.userId}`;
      const cached = await redis.get<number>(userKey).catch(() => null);
      if (cached === 1) byUser = true;
      else if (cached === 0) byUser = false;
      else {
        byUser = options.userId === event.createdBy;
        try { await redis.set(userKey, byUser ? 1 : 0, { ex: ACCESS_CHECK_TTL_SECONDS }); } catch {}
      }
    }

    if (options.accessCode) {
      const code = options.accessCode.toUpperCase().trim();
      const codeKey = `access:evt:${eventId}:v${v}:code:${code}`;
      const cached = await redis.get<number>(codeKey).catch(() => null);
      if (cached === 1) byCode = true;
      else if (cached === 0) byCode = false;
      else {
        byCode = code === (event.accessCode || '').toUpperCase().trim();
        try { await redis.set(codeKey, byCode ? 1 : 0, { ex: ACCESS_CHECK_TTL_SECONDS }); } catch {}
      }
    }

    return byUser || byCode;
  }, 'canUserAccessEvent');
}

/**
 * Gets all events created by a user with photo counts
 */
export async function getUserEvents(userId: number): Promise<EventWithPhotoCount[]> {
  return withDatabaseErrorHandling(async () => {
    return db
      .select({
        id: events.id,
        name: events.name,
        description: events.description,
        date: events.date,
        location: events.location,
        category: events.category,
        eventCode: events.eventCode,
        accessCode: events.accessCode,
        createdBy: events.createdBy,
        isPublic: events.isPublic,
        allowGuestUploads: events.allowGuestUploads,
        requireApproval: events.requireApproval,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        photoCount: sql<number>`coalesce(count(${photos.id}), 0)`,
      })
      .from(events)
      .leftJoin(photos, eq(photos.eventId, events.id))
      .where(eq(events.createdBy, userId))
      .groupBy(
        events.id,
        events.name,
        events.description,
        events.date,
        events.location,
        events.eventCode,
        events.accessCode,
        events.createdBy,
        events.isPublic,
        events.allowGuestUploads,
        events.requireApproval,
        events.createdAt,
        events.updatedAt,
      )
      .orderBy(desc(events.createdAt));
  }, 'getUserEvents');
}

// ============================================================================
// PHOTO MANAGEMENT
// ============================================================================

/**
 * Gets a photo by ID with error handling
 */
export async function getPhotoById(photoId: number) {
  return withDatabaseErrorHandling(async () => {
    return findFirst(
      db.query.photos.findMany({
        where: eq(photos.id, photoId),
        limit: 1,
      })
    );
  }, 'getPhotoById');
}

/**
 * Gets all photos for an event with optimized query
 */
export async function getPhotosForEvent(eventId: number): Promise<PhotoData[]> {
  return withDatabaseErrorHandling(async () => {
  return versionedCacheWrap(eventId, 'photos', EVENT_PHOTOS_TTL_SECONDS, async () =>
      db.query.photos.findMany({
        where: eq(photos.eventId, eventId),
        orderBy: [desc(photos.uploadedAt)],
        columns: {
          id: true,
          filename: true,
          filePath: true,
          originalFilename: true,
          mimeType: true,
          fileSize: true,
          eventId: true,
          uploadedAt: true,
          isApproved: true,
          uploadedBy: true,
          guestName: true,
          guestEmail: true,
        },
      })
    );
  }, 'getPhotosForEvent');
}

/**
 * Coalesced event payload: event record + photos (optionally only approved).
 * Server-side helper to reduce roundtrips for page bootstrap.
 */
export async function getEventWithPhotos(eventId: number, options?: { approvedOnly?: boolean }) {
  return withDatabaseErrorHandling(async () => {
    const [event, photosList] = await Promise.all([
      getEventById(eventId),
      getPhotosForEvent(eventId),
    ]);
    const out = Array.isArray(photosList)
      ? (options?.approvedOnly ? photosList.filter(p => (p as any).isApproved) : photosList)
      : [];
    return { event, photos: out };
  }, 'getEventWithPhotos');
}

/**
 * Event stats: total, approved, pending, last upload time
 */
export async function getEventStats(eventId: number): Promise<EventStats> {
  return withDatabaseErrorHandling(async () => {
    const cached = await getEventStatsCached(eventId);
    if (cached) return cached;
    const rows = await db.select({
      total: sql<number>`count(*)`,
      approved: sql<number>`sum(case when ${photos.isApproved} then 1 else 0 end)`,
      last: sql<Date>`max(${photos.uploadedAt})`,
    }).from(photos).where(eq(photos.eventId, eventId));
    const row = rows[0] as any;
    // Also compute last download timestamp from activity logs for this event
    const lastDownloadRows = await db
      .select({ last: sql<Date>`max(${activityLogs.timestamp})` })
      .from(activityLogs)
      .where(and(eq(activityLogs.eventId, eventId), eq(activityLogs.action, ActivityType.DOWNLOAD_PHOTO)));
    const lastDownload = (lastDownloadRows?.[0] as any)?.last || null;
    const stats: EventStats = {
      totalPhotos: Number(row?.total || 0),
      approvedPhotos: Number(row?.approved || 0),
      pendingApprovals: Math.max(0, Number(row?.total || 0) - Number(row?.approved || 0)),
      lastUploadAt: row?.last ? new Date(row.last).toISOString() : null,
      lastDownloadAt: lastDownload ? new Date(lastDownload).toISOString() : null,
    };
    await setEventStatsCached(eventId, stats);
    return stats;
  }, 'getEventStats');
}

/**
 * Batched stats for a user's events (optionally filtered by eventIds).
 * Returns a record keyed by eventId to EventStats. Uses a single grouped query.
 */
export async function getUserEventsStats(userId: number, filterEventIds?: number[]): Promise<Record<number, EventStats>> {
  return withDatabaseErrorHandling(async () => {
    // Ensure we only include events owned by the user
    // Left join photos to gather counts; filter by provided event ids if any
    const whereOwned = eq(events.createdBy, userId);
    const whereFilter = filterEventIds && filterEventIds.length > 0
      ? and(whereOwned, inArray(events.id, filterEventIds))
      : whereOwned;

    const rows = await db
      .select({
        eventId: events.id,
        total: sql<number>`coalesce(count(${photos.id}), 0)`,
        approved: sql<number>`coalesce(sum(case when ${photos.isApproved} then 1 else 0 end), 0)`,
        last: sql<Date>`max(${photos.uploadedAt})`,
      })
      .from(events)
      .leftJoin(photos, eq(photos.eventId, events.id))
      .where(whereFilter)
      .groupBy(events.id);

    const out: Record<number, EventStats> = {};
    for (const r of rows) {
      const total = Number((r as any)?.total || 0);
      const approved = Number((r as any)?.approved || 0);
      out[(r as any).eventId] = {
        totalPhotos: total,
        approvedPhotos: approved,
        pendingApprovals: Math.max(0, total - approved),
        lastUploadAt: (r as any)?.last ? new Date((r as any).last).toISOString() : null,
        // lastDownloadAt intentionally omitted in batch for simplicity/perf
      };
    }
    // For filtered ids with no rows (no photos), return zero stats
    if (filterEventIds && filterEventIds.length) {
      for (const id of filterEventIds) {
        if (!out[id]) {
          out[id] = { totalPhotos: 0, approvedPhotos: 0, pendingApprovals: 0, lastUploadAt: null };
        }
      }
    }
    return out;
  }, 'getUserEventsStats');
}

// ============================================================================
// EVENT CHAT
// ============================================================================

export async function getEventMessages(
  eventId: number,
  options: { limit?: number; beforeId?: number } = {}
) {
  const { limit = 50, beforeId } = options;
  return withDatabaseErrorHandling(async () => {
    return db.query.eventMessages.findMany({
      where: beforeId
        ? and(eq(eventMessages.eventId, eventId), isNull(eventMessages.deletedAt), sql`${eventMessages.id} < ${beforeId}`)
        : and(eq(eventMessages.eventId, eventId), isNull(eventMessages.deletedAt)),
      orderBy: [desc(eventMessages.id)],
      limit,
      columns: {
        id: true,
        eventId: true,
        senderUserId: true,
        guestName: true,
        body: true,
        createdAt: true,
      },
    });
  }, 'getEventMessages');
}

export async function createEventMessage(
  data: { eventId: number; senderUserId?: number | null; guestName?: string | null; body: string }
) {
  return withDatabaseErrorHandling(async () => {
    const cleanedBody = (data.body || '').toString().trim();
    if (!cleanedBody) {
      throw new Error('Message body is required');
    }
    const [created] = await db
      .insert(eventMessages)
      .values({
        eventId: data.eventId,
        senderUserId: data.senderUserId ?? null,
        // Preserve provided guestName regardless of auth; UI may still choose what to display
        guestName: data.guestName || null,
        body: cleanedBody,
      })
      .returning();
    return created;
  }, 'createEventMessage');
}
