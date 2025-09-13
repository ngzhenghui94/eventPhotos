import { NextRequest, NextResponse } from 'next/server';
import { getEventById, getEventTimeline } from '@/lib/db/queries';
import { buildIcsCalendar } from '@/lib/utils/calendar';

export async function GET(req: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  const id = Number(eventId);
  if (!id) return NextResponse.json({ error: 'Invalid eventId' }, { status: 400 });

  const event = await getEventById(id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const items = await getEventTimeline(id);

  const baseUrl = new URL(req.url);
  baseUrl.pathname = `/events/${event.eventCode}`;
  const urlStr = baseUrl.toString();

  const ics = buildIcsCalendar(event.name || 'Event Timeline', items.map((it) => ({
    uid: `tcg-${event.id}-${it.id}@thecrowdgrid` ,
    start: new Date(it.time as any),
    end: new Date(new Date(it.time as any).getTime() + 60*60*1000),
    summary: it.title,
    description: it.description || '',
    location: it.location || '',
    url: urlStr,
  })));

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${(event.name || 'event').replace(/[^a-z0-9]/gi,'_')}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}


