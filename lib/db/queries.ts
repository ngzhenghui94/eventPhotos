import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import { activityLogs, teamMembers, teams, users, events, photos } from './schema';
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

// Events queries
export async function getEventsForTeam(teamId: number) {
  return await db.query.events.findMany({
    where: eq(events.teamId, teamId),
    with: {
      createdBy: {
        columns: {
          id: true,
          name: true,
          email: true
        }
      },
      photos: true
    },
    orderBy: desc(events.createdAt)
  });
}

export async function getEventById(eventId: number) {
  return await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      createdBy: {
        columns: {
          id: true,
          name: true,
          email: true
        }
      },
      photos: {
        orderBy: desc(photos.uploadedAt)
      },
      team: true
    }
  });
}

export async function getEventByAccessCode(accessCode: string) {
  return await db.query.events.findFirst({
    where: eq(events.accessCode, accessCode),
    with: {
      createdBy: {
        columns: {
          id: true,
          name: true,
          email: true
        }
      },
      photos: {
        where: eq(photos.isApproved, true),
        orderBy: desc(photos.uploadedAt)
      },
      team: true
    }
  });
}

// Photos queries
export async function getPhotosForEvent(eventId: number, includeUnapproved: boolean = false) {
  const whereConditions = includeUnapproved 
    ? eq(photos.eventId, eventId)
    : and(eq(photos.eventId, eventId), eq(photos.isApproved, true));

  return await db.query.photos.findMany({
    where: whereConditions,
    with: {
      uploadedBy: {
        columns: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: desc(photos.uploadedAt)
  });
}

// Activity logging
export async function logActivity(teamId: number, userId: number, action: string, ipAddress?: string) {
  return await db.insert(activityLogs).values({
    teamId,
    userId,
    action,
    ipAddress: ipAddress || null,
  });
}
