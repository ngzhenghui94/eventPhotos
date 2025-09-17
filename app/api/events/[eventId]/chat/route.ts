import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { eq } from 'drizzle-orm';
import { getEventById, getEventMessages, createEventMessage, getUser, canUserAccessEvent } from '@/lib/db/queries';
import { eventMessages } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { redis } from '@/lib/upstash';

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

  // Access check: allow public, correct access code via cookie/header, or event owner
  const cookieKey = `evt:${event.eventCode}:access`;
  const codeFromCookie = (await cookies()).get(cookieKey)?.value?.toUpperCase().trim() || '';
  const codeFromHeader = request.headers.get('x-access-code')?.toUpperCase().trim() || '';
  const user = await getUser();
  const allowed = await canUserAccessEvent(Number(eventId), {
    userId: user?.id,
    accessCode: codeFromCookie || codeFromHeader || undefined,
  });
  if (!allowed) {
    return Response.json({ error: 'Access denied' }, { status: 403 });
  }

  const messages = await getEventMessages(Number(eventId), {
    limit: limit ? Math.min(100, Math.max(1, Number(limit))) : 50,
    beforeId: beforeId ? Number(beforeId) : undefined,
  });
  // return newest-last
  const ordered = [...messages].reverse();
  return Response.json({ messages: ordered });
}

function getRequestIp(req: NextRequest): string {
  let ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!ip || ip === '' || ip === '::1' || ip === '127.0.0.1') {
    ip = req.headers.get('x-real-ip')?.trim() || '';
  }
  if (!ip && (req as any).ip) {
    ip = (req as any).ip;
  }
  return ip || 'unknown-ip';
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  const event = await getEventById(Number(eventId));
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  // Access check: allow public, correct access code via cookie/header, or event owner
  const cookieKey = `evt:${event.eventCode}:access`;
  const codeFromCookie = (await cookies()).get(cookieKey)?.value?.toUpperCase().trim() || '';
  const codeFromHeader = request.headers.get('x-access-code')?.toUpperCase().trim() || '';
  const user = await getUser();
  const allowed = await canUserAccessEvent(Number(eventId), {
    userId: user?.id,
    accessCode: codeFromCookie || codeFromHeader || undefined,
  });
  if (!allowed) {
    return Response.json({ error: 'Access denied' }, { status: 403 });
  }

  // Simple IP-based rate limit: 20 messages per 5 minutes per IP per event
  const ip = getRequestIp(request);
  try {
    const rlKey = `chat:rl:${eventId}:${ip}`;
    const count = await redis.incr(rlKey);
    if (count === 1) {
      await redis.expire(rlKey, 5 * 60);
    }
    if (count > 20) {
      const ttl = await redis.ttl(rlKey);
      const waitMins = Math.max(1, Math.ceil(ttl / 60));
      return Response.json({ error: `Rate limit exceeded. Try again in ~${waitMins} min.` }, { status: 429 });
    }
  } catch {}

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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await context.params;
  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) return Response.json({ error: 'Message id required' }, { status: 400 });

  const event = await getEventById(Number(eventId));
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
  const user = await getUser();
  if (!user || (user.id !== event.createdBy && !user.isOwner)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  await db.delete(eventMessages).where(eq(eventMessages.id, id));
  return Response.json({ success: true });
}


