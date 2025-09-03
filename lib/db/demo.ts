import { db } from './drizzle';
import { users, teams, teamMembers, events } from './schema';
import { and, eq, sql } from 'drizzle-orm';

export const DEMO_ACCESS_CODE = 'DEMO';

export async function ensureDemoEvent(ownerEmail: string) {
  // Serialize demo setup to avoid race conditions
  await db.execute(sql`SELECT pg_advisory_lock(hashtext('memoriesvault_demo_setup'))`);
  try {
  // 1) Ensure owner user exists
  let owner = (await db.select().from(users).where(eq(users.email, ownerEmail)).limit(1))[0];
  if (!owner) {
    const inserted = await db
      .insert(users)
      .values({ email: ownerEmail, passwordHash: 'google-oauth', isOwner: true, role: 'owner', name: 'Demo Owner' })
      // users.email is unique
      .onConflictDoNothing({ target: users.email })
      .returning();
    owner = inserted[0] || (await db.select().from(users).where(eq(users.email, ownerEmail)).limit(1))[0]!;
  }

  // 2) Ensure a demo team (idempotent)
  let team = (await db.select().from(teams).where(eq(teams.name, 'memoriesVault Demo')).limit(1))[0];
  if (!team) {
    try {
      const inserted = await db
        .insert(teams)
        .values({ name: 'memoriesVault Demo', planName: 'Base' })
        .returning();
      team = inserted[0]!;
    } catch (e: any) {
      // If unique violation from partial unique index, fetch existing
      if (e && e.code === '23505') {
        team = (await db.select().from(teams).where(eq(teams.name, 'memoriesVault Demo')).limit(1))[0]!;
      } else {
        throw e;
      }
    }
  }

  // 3) Ensure membership as owner (scoped to the demo team)
  const membership = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, owner.id), eq(teamMembers.teamId, team.id)))
    .limit(1);
  if (membership.length === 0) {
    await db.insert(teamMembers).values({ teamId: team.id, userId: owner.id, role: 'owner' });
  }

  // 4) Ensure a demo event
  let event = (
    await db.select().from(events).where(eq(events.accessCode, DEMO_ACCESS_CODE)).limit(1)
  )[0];
  if (!event) {
    try {
      const inserted = await db
        .insert(events)
        .values({
  name: 'memoriesVault Demo Event',
          description: 'Public demo event for uploads and gallery preview.',
          date: new Date(),
          location: 'Online',
  eventCode: 'DEMO1234',
          accessCode: DEMO_ACCESS_CODE,
          teamId: team.id,
          createdBy: owner.id,
          isPublic: true,
          allowGuestUploads: true,
          requireApproval: false,
        })
        .returning();
      event = inserted[0]!;
    } catch (e: any) {
      // Unique violation (if unique index exists) -> fetch existing; otherwise rethrow
      if (e && e.code === '23505') {
        event = (await db.select().from(events).where(eq(events.accessCode, DEMO_ACCESS_CODE)).limit(1))[0]!;
      } else {
        throw e;
      }
    }
  }

    return { owner, team, event };
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(hashtext('memoriesvault_demo_setup'))`);
  }
}

export async function getDemoEvent(ownerEmail: string) {
  const { owner, team, event } = await ensureDemoEvent(ownerEmail);
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    date: event.date,
    location: event.location,
    accessCode: event.accessCode,
    team: { id: team.id, name: team.name },
    owner: { id: owner.id, email: owner.email, name: owner.name },
    galleryPath: `/gallery/${event.id}`,
  guestPath: `/events/${event.eventCode}`,
  };
}
