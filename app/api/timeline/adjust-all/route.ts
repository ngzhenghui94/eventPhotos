import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser, getEventById, getEventTimeline, updateEventTimelineEntry } from '@/lib/db/queries';

const AdjustAllSchema = z.object({
  eventId: z.number(),
  // Delay = +15, Bring forward = -15
  deltaMinutes: z.number().refine((n) => Math.abs(n) === 15, 'deltaMinutes must be +/-15'),
});

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = AdjustAllSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const event = await getEventById(parsed.data.eventId);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const isOwner = event.createdBy === user.id || !!(user as any).isOwner;
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const entries = await getEventTimeline(parsed.data.eventId);
    const deltaMs = parsed.data.deltaMinutes * 60 * 1000;
    await Promise.all(entries.map((e) => {
      const current = new Date((e as any).time);
      const next = new Date(current.getTime() + deltaMs);
      return updateEventTimelineEntry(e.id, { time: next });
    }));

    return NextResponse.json({ success: 'All timeline entries adjusted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}


