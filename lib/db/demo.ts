import { db } from './drizzle';
import { users, events } from './schema';
import { and, eq, sql } from 'drizzle-orm';

export const DEMO_ACCESS_CODE = 'DEMO';

// Fast-path: fetch existing demo without any locks
async function getExistingDemo() {
  const event = (await db.select().from(events).where(eq(events.accessCode, DEMO_ACCESS_CODE)).limit(1))[0];
  if (!event) return null;
  const owner = (await db.select().from(users).where(eq(users.id, event.createdBy)).limit(1))[0] ?? { id: event.createdBy, email: 'demo@example.com', name: 'Demo Owner' } as any;
  return { owner, event };
}

// Simple in-memory cache to avoid repeated setup on hot paths
type DemoCache = { data: { owner: any; event: any }; at: number } | null;
let demoCache: DemoCache = null;

function getCached(ttlMs = 30_000) {
  if (demoCache && Date.now() - demoCache.at < ttlMs) {
    return demoCache.data;
  }
  return null;
}

function setCached(data: { owner: any; event: any }) {
  demoCache = { data, at: Date.now() };
}

export async function ensureDemoEvent(ownerEmail: string) {
  // Check memory cache first
  const cached = getCached();
  if (cached) return cached;
  // 1) Try fast-path (no lock)
  const existing = await getExistingDemo();
  if (existing) return existing;

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

  // Create event
  let event = (await db.select().from(events).where(eq(events.accessCode, DEMO_ACCESS_CODE)).limit(1))[0];
  if (!event) {
    // Use upsert logic to avoid duplicate creation
    const inserted = await db
      .insert(events)
      .values({
        name: 'The Crowd Grid Demo Event',
        description: 'Public demo event for uploads and gallery preview.',
        date: new Date(),
        location: 'Online',
        eventCode: 'DEMO1234',
        accessCode: DEMO_ACCESS_CODE,
        createdBy: owner.id,
        isPublic: true,
        allowGuestUploads: true,
        requireApproval: false,
      })
      .onConflictDoNothing({ target: events.accessCode })
      .returning();
    event = inserted[0] || (await db.select().from(events).where(eq(events.accessCode, DEMO_ACCESS_CODE)).limit(1))[0]!;
  }

  const result = { owner, event };
  setCached(result);
  return result;
}

export async function getDemoEvent(ownerEmail: string) {
  try {
    const demo = await ensureDemoEvent(ownerEmail);
    if (!demo) {
      // Could not get or create demo event
      throw new Error('Could not get or create demo event');
    }
    const { owner, event } = demo;
    const result = {
      id: event.id,
      name: event.name,
      description: event.description,
      date: event.date,
      location: event.location,
      accessCode: event.accessCode,
      owner: { id: owner.id, email: owner.email, name: owner.name },
      galleryPath: `/gallery/${event.id}`,
      guestPath: `/events/${event.eventCode}`,
    };
    // Cache shaped result too for quick API responses
    setCached({ owner, event });
    return result;
  } catch (error) {
    console.error('Error in getDemoEvent:', error);
    throw error;
  }
}
