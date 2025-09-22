import { NextRequest } from 'next/server';
import { getUser, getEventById, canUserAccessEvent, getEventStats } from '@/lib/db/queries';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId: eventIdStr } = await context.params;
    const eventId = parseInt(eventIdStr, 10);
    if (!eventId || isNaN(eventId)) {
      return Response.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Access: public, correct code (cookie/header/query), or owner
    const url = new URL(request.url);
    const codeFromHeader = request.headers.get('x-access-code') || undefined;
    const codeFromQuery = url.searchParams.get('code') || undefined;
    let codeFromCookie: string | undefined;
    try {
      if (event.eventCode) {
        const cookieKey = `evt:${event.eventCode}:access`;
        codeFromCookie = (await cookies()).get(cookieKey)?.value?.toUpperCase().trim();
      }
    } catch {}
    const user = await getUser();
    const providedCode = (codeFromCookie || codeFromHeader || codeFromQuery)?.toUpperCase().trim();
    const allowed = await canUserAccessEvent(eventId, {
      userId: user?.id,
      accessCode: providedCode || undefined,
    });
    if (!allowed) {
      return Response.json({ error: 'Not authorized to view stats for this event' }, { status: 403 });
    }

    const stats = await getEventStats(eventId);
    return Response.json(stats, { status: 200 });
  } catch (error) {
    console.error('[api][event-stats][error]', error);
    return Response.json({ error: 'Failed to fetch event stats' }, { status: 500 });
  }
}
