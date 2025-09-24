import { NextResponse } from 'next/server';
import { getUser, getTimelineEntryById, getEventById, updateEventTimelineEntry, getUserEventRole, canRoleManageTimeline } from '@/lib/db/queries';
import { z } from 'zod';

const AdjustSchema = z.object({
  id: z.number(),
  deltaMinutes: z.number().refine((n) => Math.abs(n) === 15, 'deltaMinutes must be +/-15'),
});

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = AdjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const existing = await getTimelineEntryById(parsed.data.id);
    if (!existing) return NextResponse.json({ error: 'Timeline entry not found' }, { status: 404 });

    const event = await getEventById(existing.eventId);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const role = await getUserEventRole(event.id, user.id);
  const canManage = !!(user as any).isOwner || event.createdBy === user.id || canRoleManageTimeline(role);
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const current = new Date(existing.time as any);
    const updated = new Date(current.getTime() + parsed.data.deltaMinutes * 60 * 1000);
    const entry = await updateEventTimelineEntry(existing.id, { time: updated });
    return NextResponse.json({ success: 'Timeline entry adjusted', entry });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}


