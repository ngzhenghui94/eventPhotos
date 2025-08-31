import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { events, photos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  await requireSuperAdmin();
  const { eventId: eventIdParam } = await context.params;
  const eventId = Number(eventIdParam);
  if (!eventId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  // delete photos first to avoid FK constraint issues
  await db.delete(photos).where(eq(photos.eventId, eventId));
  await db.delete(events).where(eq(events.id, eventId));
  return NextResponse.redirect(new URL('/dashboard/admin/events', request.url));
}
