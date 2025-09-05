import { db } from '../drizzle';
import { users, events } from '../schema';
import { eq } from 'drizzle-orm';

const DEMO_ACCESS_CODE = 'DEMO';
const DEMO_EVENT_CODE = 'DEMO1234';
const DEMO_EMAIL = 'demo@example.com';

async function main() {
  // Create demo owner if not exists
  let owner = (await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1))[0];
  if (!owner) {
    const inserted = await db
      .insert(users)
      .values({
        email: DEMO_EMAIL,
        passwordHash: 'google-oauth',
        isOwner: true,
        role: 'owner',
        name: 'Demo Owner',
      })
      .onConflictDoNothing({ target: users.email })
      .returning();
    owner = inserted[0] || (await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1))[0];
  }

  // Create demo event if not exists
  let event = (await db.select().from(events).where(eq(events.accessCode, DEMO_ACCESS_CODE)).limit(1))[0];
  if (!event) {
    const inserted = await db
      .insert(events)
      .values({
        name: 'memoriesVault Demo Event',
        description: 'Public demo event for uploads and gallery preview.',
        date: new Date(),
        location: 'Online',
        eventCode: DEMO_EVENT_CODE,
        accessCode: DEMO_ACCESS_CODE,
        createdBy: owner.id,
        isPublic: true,
        allowGuestUploads: true,
        requireApproval: false,
      })
      .onConflictDoNothing({ target: events.accessCode })
      .returning();
    event = inserted[0] || (await db.select().from(events).where(eq(events.accessCode, DEMO_ACCESS_CODE)).limit(1))[0];
  }

  console.log('Demo event created:', { owner, event });
}

main().catch((err) => {
  console.error('Error creating demo event:', err);
  process.exit(1);
});
