import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import { activityLogs, teamMembers, teams, users, events, photos, ActivityType } from './schema';

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

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function logActivity(teamId: number, userId: number | null, action: ActivityType) {
  await db.insert(activityLogs).values({
    teamId,
    userId,
    action,
    timestamp: new Date(),
  });
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getTeamForUser() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  return result?.team || null;
}


// Event-related queries
export async function getEventsForTeam(teamId: number) {
  return await db
    .select({
      id: events.id,
      name: events.name,
      description: events.description,
      date: events.date,
      location: events.location,
      isPublic: events.isPublic,
      allowGuestUploads: events.allowGuestUploads,
      requireApproval: events.requireApproval,
      createdAt: events.createdAt,
      ownerName: users.name,
      ownerId: events.createdBy
    })
    .from(events)
    .leftJoin(users, eq(events.createdBy, users.id))
    .where(eq(events.teamId, teamId))
    .orderBy(desc(events.createdAt));
}

export async function getEventById(eventId: number) {
  const result = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      createdBy: {
        columns: { id: true, name: true, email: true }
      },
      team: {
        columns: {
          id: true,
          name: true,
          planName: true,
        }
      }
    }
  });

  return result;
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
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
    })
    .from(photos)
    .leftJoin(users, eq(photos.uploadedBy, users.id))
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
    uploadedByUser: r.userId ? { id: r.userId, name: r.userName, email: r.userEmail! } : null,
    guestName: r.guestName,
    guestEmail: r.guestEmail,
  }));
}

export async function getPhotoById(photoId: number) {
  const result = await db.query.photos.findFirst({
    where: eq(photos.id, photoId),
    with: {
      event: {
        with: {
          createdBy: { columns: { id: true, name: true, email: true } },
          team: {
            columns: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  return result;
}

// Check if user can access event (owner, team member, or public event)
export async function canUserAccessEvent(eventId: number, userId?: number) {
  const event = await getEventById(eventId);
  if (!event) return false;

  // Public events can be accessed by anyone
  if (event.isPublic) return true;

  // Must be authenticated for private events
  if (!userId) return false;

  // Owner can always access
  if (event.createdBy === userId) return true;

  // Team members can access
  const userTeam = await getUserWithTeam(userId);
  if (userTeam && userTeam.teamId === event.teamId) return true;

  return false;
}

// Check if user can upload photos to event
export async function canUserUploadToEvent(eventId: number, userId?: number) {
  const event = await getEventById(eventId);
  if (!event) return false;

  // Owner can always upload
  if (userId && event.createdBy === userId) return true;

  // Team members can upload
  if (userId) {
    const userTeam = await getUserWithTeam(userId);
    if (userTeam && userTeam.teamId === event.teamId) return true;
  }

  // Guest uploads allowed for public events
  if (event.isPublic && event.allowGuestUploads) return true;

  return false;
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
