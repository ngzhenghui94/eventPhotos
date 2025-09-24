import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser, getEventById, getUserEventRole, canRoleManageEvent, listEventMembersWithUsers, findUserByEmail, addOrUpdateEventMember, removeEventMember } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/events/[eventId]/members -> list members with user details
export async function GET(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId: eventIdParam } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const eventId = Number(eventIdParam);
    if (!eventId || !Number.isFinite(eventId)) return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });

    const event = await getEventById(eventId);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const role = await getUserEventRole(event.id, user.id);
    const allowed = !!user.isOwner || user.id === event.createdBy || canRoleManageEvent(role);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const rows = await listEventMembersWithUsers(eventId);
    return NextResponse.json({ members: rows });
  } catch (err) {
    console.error('[api][event-members][list][error]', err);
    return NextResponse.json({ error: 'Failed to list members' }, { status: 500 });
  }
}

const UpsertSchema = z.object({
  email: z.string().email(),
  role: z.enum(['host', 'organizer', 'photographer', 'customer']),
});

// POST /api/events/[eventId]/members -> add or update member by email
export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId: eventIdParam } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const eventId = Number(eventIdParam);
    if (!eventId || !Number.isFinite(eventId)) return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });

    const event = await getEventById(eventId);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const role = await getUserEventRole(event.id, user.id);
    const allowed = !!user.isOwner || user.id === event.createdBy || canRoleManageEvent(role);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const parsed = UpsertSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const target = await findUserByEmail(parsed.data.email);
    if (!target) return NextResponse.json({ error: 'No user found with that email' }, { status: 404 });

    // Prevent changing host role away from creator unless app owner
    if (target.id === event.createdBy && parsed.data.role !== 'host' && !user.isOwner) {
      return NextResponse.json({ error: 'Cannot change host role' }, { status: 400 });
    }

    const row = await addOrUpdateEventMember(eventId, target.id, parsed.data.role);
    return NextResponse.json({ success: true, member: row });
  } catch (err) {
    console.error('[api][event-members][upsert][error]', err);
    return NextResponse.json({ error: 'Failed to upsert member' }, { status: 500 });
  }
}

const RemoveSchema = z.object({ userId: z.number() });

// DELETE /api/events/[eventId]/members -> remove member by userId
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId: eventIdParam } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const eventId = Number(eventIdParam);
    if (!eventId || !Number.isFinite(eventId)) return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });

    const event = await getEventById(eventId);
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const role = await getUserEventRole(event.id, user.id);
    const allowed = !!user.isOwner || user.id === event.createdBy || canRoleManageEvent(role);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const parsed = RemoveSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    if (parsed.data.userId === event.createdBy) {
      return NextResponse.json({ error: 'Cannot remove host from event' }, { status: 400 });
    }

    await removeEventMember(eventId, parsed.data.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api][event-members][remove][error]', err);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
