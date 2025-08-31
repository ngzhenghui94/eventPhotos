import { db } from './drizzle';
import { users, teams, teamMembers, events } from './schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth/session';

export const DEMO_ACCESS_CODE = 'DEMO';

export async function ensureDemoEvent(ownerEmail: string) {
  // 1) Ensure owner user exists
  let owner = (await db.select().from(users).where(eq(users.email, ownerEmail)).limit(1))[0];
  if (!owner) {
    const pwd = await hashPassword(Math.random().toString(36).slice(2));
    const inserted = await db
      .insert(users)
      .values({ email: ownerEmail, passwordHash: pwd, isOwner: true, role: 'owner', name: 'Demo Owner' })
      // users.email is unique
      .onConflictDoNothing({ target: users.email })
      .returning();
    owner = inserted[0] || (await db.select().from(users).where(eq(users.email, ownerEmail)).limit(1))[0]!;
  }

  // 2) Ensure a demo team
  let team = (await db.select().from(teams).where(eq(teams.name, 'MemoriesVault Demo')).limit(1))[0];
  if (!team) {
    [team] = await db.insert(teams).values({ name: 'MemoriesVault Demo', planName: 'Base' }).returning();
  }

  // 3) Ensure membership as owner
  const membership = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, owner.id))
    .limit(1);
  if (membership.length === 0) {
    await db.insert(teamMembers).values({ teamId: team.id, userId: owner.id, role: 'owner' });
  }

  // 4) Ensure a demo event
  let event = (
    await db.select().from(events).where(eq(events.accessCode, DEMO_ACCESS_CODE)).limit(1)
  )[0];
  if (!event) {
    const inserted = await db
      .insert(events)
      .values({
        name: 'MemoriesVault Demo Event',
        description: 'Public demo event for uploads and gallery preview.',
        date: new Date(),
        location: 'Online',
        accessCode: DEMO_ACCESS_CODE,
        teamId: team.id,
        createdBy: owner.id,
        isPublic: true,
        allowGuestUploads: true,
        requireApproval: false,
      })
      // access_code is unique; avoid throwing on races
      .onConflictDoNothing({ target: events.accessCode })
      .returning();
    event = inserted[0] || (await db.select().from(events).where(eq(events.accessCode, DEMO_ACCESS_CODE)).limit(1))[0]!;
  }

  return { owner, team, event };
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
    guestPath: `/guest/${event.accessCode}`,
  };
}
