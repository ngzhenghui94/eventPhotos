import { db } from '@/lib/db/drizzle';
import { events, photos } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { withDatabaseErrorHandling } from '@/lib/utils/database';

/**
 * Event management utilities with optimized queries
 */
export class EventUtils {
  /**
   * Checks if user can access event and returns event data in one query
   */
  static async getEventWithAccess(
    eventId: number, 
    userId?: number, 
    accessCode?: string
  ) {
    return withDatabaseErrorHandling(async () => {
      const event = await db.query.events.findFirst({
        where: eq(events.id, eventId),
        with: {
          createdBy: {
            columns: { id: true, name: true, email: true }
          }
        }
      });

      if (!event) {
        return { event: null, canAccess: false };
      }

      // Check access permissions
      const canAccess = event.isPublic || 
                       (accessCode && accessCode === event.accessCode) ||
                       (userId && userId === event.createdBy);

      return { event, canAccess };
    }, 'getEventWithAccess');
  }

  /**
   * Gets event with photo count and user permission check
   */
  static async getEventSummary(eventId: number, userId?: number) {
    return withDatabaseErrorHandling(async () => {
      const result = await db
        .select({
          id: events.id,
          name: events.name,
          description: events.description,
          date: events.date,
          location: events.location,
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
        .where(eq(events.id, eventId))
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
        );

      if (result.length === 0) {
        return { event: null, isOwner: false };
      }

      const event = result[0];
      const isOwner = userId && userId === event.createdBy;

      return { event, isOwner };
    }, 'getEventSummary');
  }

  /**
   * Checks if event allows specific operation based on user and permissions
   */
  static canPerformOperation(
    event: any,
    userId: number | undefined,
    operation: 'upload' | 'approve' | 'delete' | 'view'
  ): boolean {
    if (!event) return false;
    
    const isOwner = userId && userId === event.createdBy;
    
    switch (operation) {
      case 'upload':
        return isOwner || event.allowGuestUploads;
      case 'approve':
      case 'delete':
        return !!isOwner;
      case 'view':
        return event.isPublic || !!isOwner;
      default:
        return false;
    }
  }

  /**
   * Gets events with optimized photo counting for dashboard
   */
  static async getUserEventsWithStats(userId: number, limit = 50) {
    return withDatabaseErrorHandling(async () => {
      return db
        .select({
          id: events.id,
          name: events.name,
          description: events.description,
          date: events.date,
          location: events.location,
          eventCode: events.eventCode,
          isPublic: events.isPublic,
          allowGuestUploads: events.allowGuestUploads,
          requireApproval: events.requireApproval,
          createdAt: events.createdAt,
          updatedAt: events.updatedAt,
          photoCount: sql<number>`coalesce(count(${photos.id}), 0)`,
          approvedCount: sql<number>`coalesce(sum(case when ${photos.isApproved} then 1 else 0 end), 0)`,
          pendingCount: sql<number>`coalesce(sum(case when not ${photos.isApproved} then 1 else 0 end), 0)`,
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
          events.isPublic,
          events.allowGuestUploads,
          events.requireApproval,
          events.createdAt,
          events.updatedAt,
        )
        .orderBy(sql`${events.updatedAt} desc`)
        .limit(limit);
    }, 'getUserEventsWithStats');
  }
}