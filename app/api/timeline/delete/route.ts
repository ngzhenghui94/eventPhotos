import { NextResponse } from 'next/server';
import { deleteEventTimelineEntry, getTimelineEntryById, getEventById, getUser, getUserEventRole, canRoleManageTimeline } from '@/lib/db/queries';

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'Missing timeline entry id' }, { status: 400 });
  try {
    // Auth and ownership check
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const existing = await getTimelineEntryById(id);
    if (!existing) return NextResponse.json({ error: 'Timeline entry not found' }, { status: 404 });
    const event = await getEventById(existing.eventId);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const role = await getUserEventRole(event.id, user.id);
  const canManage = !!user.isOwner || event.createdBy === user.id || canRoleManageTimeline(role);
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await deleteEventTimelineEntry(id);
    return NextResponse.json({ success: 'Timeline entry deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
