import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { eq } from 'drizzle-orm';
import { events } from '@/lib/db/schema';
import { getEventById, getEventMessages, createEventMessage, getUser } from '@/lib/db/queries';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  const url = new URL(request.url);
  const beforeId = url.searchParams.get('beforeId');
  const limit = url.searchParams.get('limit');

  const event = await getEventById(Number(eventId));
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  // Access check for guests: require cookie code if private
  if (!event.isPublic) {
    const cookieKey = `evt:${event.eventCode}:access`;
    const code = (await cookies()).get(cookieKey)?.value?.toUpperCase().trim();
    if (!code || code !== event.accessCode.toUpperCase()) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }
  }

  const messages = await getEventMessages(Number(eventId), {
    limit: limit ? Math.min(100, Math.max(1, Number(limit))) : 50,
    beforeId: beforeId ? Number(beforeId) : undefined,
  });
  // return newest-last
  const ordered = [...messages].reverse();
  return Response.json({ messages: ordered });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  const event = await getEventById(Number(eventId));
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  // Access check for guests: require cookie code if private
  if (!event.isPublic) {
    const cookieKey = `evt:${event.eventCode}:access`;
    const code = (await cookies()).get(cookieKey)?.value?.toUpperCase().trim();
    if (!code || code !== event.accessCode.toUpperCase()) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }
  }

  const user = await getUser();
  let body: string = '';
  let guestName: string | undefined;
  try {
    const payload = await request.json();
    body = (payload?.body || '').toString();
    guestName = payload?.guestName ? String(payload.guestName).slice(0, 100) : undefined;
  } catch {}
  if (!body || body.trim().length === 0) {
    return Response.json({ error: 'Message body required' }, { status: 400 });
  }

  const created = await createEventMessage({
    eventId: Number(eventId),
    senderUserId: user?.id || null,
    guestName: guestName || undefined,
    body,
  });

  return Response.json(created, { status: 201 });
}


