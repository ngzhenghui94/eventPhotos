import { NextResponse } from 'next/server';
import { createEventTimelineEntry, getEventById, getUser, getUserEventRole, canRoleManageTimeline } from '@/lib/db/queries';
import { z } from 'zod';

const TimelineEntrySchema = z.object({
  eventId: z.string().transform(Number),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  location: z.string().max(255).optional(),
  time: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date/time'),
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const parsed = TimelineEntrySchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    // Auth and ownership check
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const event = await getEventById(parsed.data.eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    const role = await getUserEventRole(event.id, user.id);
    const canManage = !!user.isOwner || event.createdBy === user.id || canRoleManageTimeline(role);
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const entry = await createEventTimelineEntry({
      eventId: parsed.data.eventId,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      time: new Date(parsed.data.time),
    });
    return NextResponse.json({ success: 'Timeline entry added', entry });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
