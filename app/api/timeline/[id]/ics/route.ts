import { NextRequest, NextResponse } from 'next/server';
import { getTimelineEntryById, getEventById } from '@/lib/db/queries';
import { buildIcsCalendar } from '@/lib/utils/calendar';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const entryId = Number(id);
  if (!entryId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const entry = await getTimelineEntryById(entryId);
  if (!entry) return NextResponse.json({ error: 'Timeline entry not found' }, { status: 404 });
  const event = await getEventById(entry.eventId);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const baseUrl = new URL(req.url);
  baseUrl.pathname = `/events/${event.eventCode}`;
  const urlStr = baseUrl.toString();

  const ics = buildIcsCalendar(event.name || 'Event Timeline', [
    {
      uid: `tcg-${event.id}-${entry.id}@thecrowdgrid`,
      start: new Date(entry.time as any),
      end: new Date(new Date(entry.time as any).getTime() + 60*60*1000),
      summary: entry.title,
      description: entry.description || '',
      location: entry.location || '',
      url: urlStr,
    }
  ]);

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${(entry.title || 'timeline').replace(/[^a-z0-9]/gi,'_')}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}


