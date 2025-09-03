import { db } from './drizzle';
import { users, teams, teamMembers, events } from './schema';
import { and, eq, sql } from 'drizzle-orm';

export const DEMO_ACCESS_CODE = 'DEMO';

// Fast-path: fetch existing demo without any locks
async function getExistingDemo() {
  const event = (await db.select().from(events).where(eq(events.accessCode, DEMO_ACCESS_CODE)).limit(1))[0];
  if (!event) return null;
  const team = (await db.select().from(teams).where(eq(teams.id, event.teamId)).limit(1))[0] ?? { id: event.teamId, name: 'memoriesVault Demo' } as any;
  const owner = (await db.select().from(users).where(eq(users.id, event.createdBy)).limit(1))[0] ?? { id: event.createdBy, email: 'demo@example.com', name: 'Demo Owner' } as any;
  return { owner, team, event };
}

// Simple in-memory cache to avoid repeated setup on hot paths
type DemoCache = { data: { owner: any; team: any; event: any }; at: number } | null;
let demoCache: DemoCache = null;

function getCached(ttlMs = 30_000) {
  if (demoCache && Date.now() - demoCache.at < ttlMs) {
    return demoCache.data;
  }
  return null;
}

function setCached(data: { owner: any; team: any; event: any }) {
  demoCache = { data, at: Date.now() };
}

export async function ensureDemoEvent(ownerEmail: string) {
  // Check memory cache first
  const cached = getCached();
  if (cached) return cached;
  // 1) Try fast-path (no lock)
  const existing = await getExistingDemo();
  if (existing) return existing;

  // 2) If not found, attempt to create under a short try-lock loop
  const start = Date.now();
  const LOCK_KEY_SQL = sql`hashtext('memoriesvault_demo_setup')`;

  while (true) {
    // Try to acquire lock without blocking
    const res: any = await db.execute(sql`SELECT pg_try_advisory_lock(${LOCK_KEY_SQL}) AS got`);
    const got = res?.rows?.[0]?.got ?? res?.rows?.[0]?.pg_try_advisory_lock ?? false;

    if (got) {
      try {
        // Re-check in case another worker created it just before we got the lock
        const again = await getExistingDemo();
        if (again) return again;

        // Create owner
        let owner = (await db.select().from(users).where(eq(users.email, ownerEmail)).limit(1))[0];
        if (!owner) {
          const inserted = await db
            .insert(users)
            .values({ email: ownerEmail, passwordHash: 'google-oauth', isOwner: true, role: 'owner', name: 'Demo Owner' })
            .onConflictDoNothing({ target: users.email })
            .returning();
          owner = inserted[0] || (await db.select().from(users).where(eq(users.email, ownerEmail)).limit(1))[0]!;
        }

        // Create team (idempotent)
        let team = (await db.select().from(teams).where(eq(teams.name, 'memoriesVault Demo')).limit(1))[0];
        if (!team) {
          try {
            const inserted = await db.insert(teams).values({ name: 'memoriesVault Demo', planName: 'Base' }).returning();
            team = inserted[0]!;
          } catch (e: any) {
            if (e && e.code === '23505') {
              team = (await db.select().from(teams).where(eq(teams.name, 'memoriesVault Demo')).limit(1))[0]!;
            } else {
              throw e;
            }
          }
        }

        // Ensure membership
        const membership = await db
          .select()
          .from(teamMembers)
          .where(and(eq(teamMembers.userId, owner.id), eq(teamMembers.teamId, team.id)))
          .limit(1);
        if (membership.length === 0) {
          await db.insert(teamMembers).values({ teamId: team.id, userId: owner.id, role: 'owner' });
        }

        // Create event
        let event = (await db.select().from(events).where(eq(events.accessCode, DEMO_ACCESS_CODE)).limit(1))[0];
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
            if (e && e.code === '23505') {
              event = (await db.select().from(events).where(eq(events.accessCode, DEMO_ACCESS_CODE)).limit(1))[0]!;
            } else {
              throw e;
            }
          }
        }

  const result = { owner, team, event };
  setCached(result);
  return result;
      } finally {
        await db.execute(sql`SELECT pg_advisory_unlock(${LOCK_KEY_SQL})`);
      }
    }

    // Didn't get the lock; backoff and try again, but cap total wait to 5s
    if (Date.now() - start > 5000) {
      // Best-effort: if someone else created it, return that; otherwise, error
      const eventual = await getExistingDemo();
      if (eventual) {
        setCached(eventual);
        return eventual;
      }
      throw new Error('demo_setup_lock_timeout');
    }
    await new Promise((r) => setTimeout(r, 150));
  }
}

export async function getDemoEvent(ownerEmail: string) {
  try {
    const { owner, team, event } = await ensureDemoEvent(ownerEmail);
    const result = {
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
    // Cache shaped result too for quick API responses
    setCached({ owner, team, event });
    return result;
  } catch (error) {
    console.error('Error in getDemoEvent:', error);
    throw error;
  }
}
