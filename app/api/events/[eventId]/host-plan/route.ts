import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { events, users } from '@/lib/db/schema';
import { uploadLimitBytes, normalizePlanName } from '@/lib/plans';
import { eq } from 'drizzle-orm';

import type { NextRequest } from 'next/server';
export async function GET(req: NextRequest, context: { params: { eventId: string } }) {
  const { params } = context;
  const eventId = Number((await params).eventId);
  if (!eventId || isNaN(eventId)) {
    return NextResponse.json({ error: 'Invalid eventId' }, { status: 400 });
  }
  // Get event
  const event = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event[0]) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  // Get host
  const host = await db.select().from(users).where(eq(users.id, event[0].createdBy)).limit(1);
  const planName = host[0]?.planName || 'free';
  const maxFileSize = uploadLimitBytes(normalizePlanName(planName));
  return NextResponse.json({ planName, maxFileSize });
}
