// Update user's subscription plan and status
export async function updateUserSubscription({ userId, planName, subscriptionStatus, stripeCustomerId, stripeSubscriptionId, subscriptionStart, subscriptionEnd }: {
  userId: number,
  planName: string,
  subscriptionStatus: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string,
  subscriptionStart?: Date | null,
  subscriptionEnd?: Date | null
}) {
  await db.update(users)
    .set({
      planName,
      subscriptionStatus,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionStart,
      subscriptionEnd,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));
// ...existing code...
}
// Helper to log activity
export async function logActivity({ userId, action, ipAddress, detail }: { userId: number, action: string, ipAddress?: string, detail?: string }) {
  await db.insert(activityLogs).values({
    userId,
    action,
    ipAddress: ipAddress || null,
    detail: detail || null,
  });
}
// Fetch recent activity logs for an event
export async function getActivityLogs(eventId: number, limit: number = 50) {
  // Fetch recent logs for all users, optionally filter by userId if needed
  const rows = await db
    .select({
      id: activityLogs.id,
      userId: activityLogs.userId,
      action: activityLogs.action,
      detail: activityLogs.detail,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
    })
    .from(activityLogs)
    .orderBy(desc(activityLogs.timestamp))
    .limit(limit);
  return rows;
}
// Fetch photo by id
export async function getPhotoById(photoId: number) {
  const photo = await db.select().from(photos).where(eq(photos.id, photoId)).limit(1);
  return photo[0] || null;
}
// Checks if a user can access an event by id and optional access code
export async function canUserAccessEvent(eventId: number, userId?: number, code?: string | null) {
  // Fetch event
  const event = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event[0]) return false;
  // Public event or correct access code
  if (event[0].isPublic || (code && code === event[0].accessCode)) return true;
  // Owner access
  if (userId && userId === event[0].createdBy) return true;
  return false;
}

// Fetch event by id
export async function getEventById(eventId: number) {
  const event = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  return event[0] || null;
}
export async function getPhotosForEvent(eventId: number) {
  const rows = await db
    .select({
      id: photos.id,
      filename: photos.filename,
      filePath: photos.filePath,
      originalFilename: photos.originalFilename,
      mimeType: photos.mimeType,
      fileSize: photos.fileSize,
      eventId: photos.eventId,
      uploadedAt: photos.uploadedAt,
      isApproved: photos.isApproved,
      uploadedById: photos.uploadedBy,
      guestName: photos.guestName,
      guestEmail: photos.guestEmail,
    })
    .from(photos)
    .where(eq(photos.eventId, eventId))
    .orderBy(desc(photos.uploadedAt));

  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    filePath: r.filePath,
    originalFilename: r.originalFilename,
    mimeType: r.mimeType,
    fileSize: r.fileSize,
    eventId: r.eventId,
    uploadedAt: r.uploadedAt,
    isApproved: r.isApproved,
    uploadedBy: r.uploadedById,
    guestName: r.guestName,
    guestEmail: r.guestEmail,
  }));
}
import { desc, and, eq, isNull, inArray, sql } from 'drizzle-orm';
import { db } from './drizzle';
import { activityLogs, users, events, photos, ActivityType } from './schema';

import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  // Get user
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
      isOwner: users.isOwner,
      planName: users.planName,
      stripeCustomerId: users.stripeCustomerId,
      stripeSubscriptionId: users.stripeSubscriptionId,
      subscriptionStatus: users.subscriptionStatus,
      subscriptionStart: users.subscriptionStart,
      subscriptionEnd: users.subscriptionEnd,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      deletedAt: users.deletedAt
    })
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0];
}


// ...existing code...

// Fetch all events created by a user
export async function getUserEvents(userId: number) {
  return await db.select().from(events).where(eq(events.createdBy, userId));
}

export async function getEventByAccessCode(code: string) {
  return await db.query.events.findFirst({
    where: eq(events.accessCode, code),
    with: {
      createdBy: {
        columns: { id: true, name: true, email: true }
      }
    }
  });
}

export async function getEventByEventCode(code: string) {
  return await db.query.events.findFirst({
    where: eq(events.eventCode, code),
    with: {
      createdBy: {
        columns: { id: true, name: true, email: true }
      }
    }
  });
}
