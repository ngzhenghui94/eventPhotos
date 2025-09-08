import { desc, and, eq, isNull, inArray, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from './drizzle';
import { activityLogs, users, events, photos, ActivityType } from './schema';
import { verifyToken } from '@/lib/auth/session';
import type {
  UserSubscriptionData,
  ActivityLogData,
  EventAccessOptions,
  PhotoData,
  EventWithPhotoCount,
  PaginationOptions,
} from '@/lib/types/common';
import { withDatabaseErrorHandling, findFirst, validateRequiredFields } from '@/lib/utils/database';

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
        stripeSubscriptionId: data.stripeSubscriptionId,
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
  validateRequiredFields(data, ['userId', 'action']);
  
  return withDatabaseErrorHandling(async () => {
    await db.insert(activityLogs).values({
      userId: data.userId,
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
    return findFirst(
      db.query.events.findMany({
        where: eq(events.id, eventId),
        limit: 1,
      })
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
    return db.query.events.findFirst({
      where: eq(events.eventCode, code),
      with: {
        createdBy: {
          columns: { id: true, name: true, email: true }
        }
      }
    });
  }, 'getEventByEventCode');
}

/**
 * Checks if a user can access an event with proper validation
 */
export async function canUserAccessEvent(eventId: number, options: EventAccessOptions = {}): Promise<boolean> {
  return withDatabaseErrorHandling(async () => {
    const event = await getEventById(eventId);
    if (!event) return false;

    // Public event or correct access code
    if (event.isPublic || (options.accessCode && options.accessCode === event.accessCode)) {
      return true;
    }

    // Owner access
    if (options.userId && options.userId === event.createdBy) {
      return true;
    }

    return false;
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
    return db.query.photos.findMany({
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
    });
  }, 'getPhotosForEvent');
}
