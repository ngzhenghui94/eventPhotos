import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { events, ActivityType } from '@/lib/db/schema';
import { getUser, getTeamForUser, getEventsForTeam } from '@/lib/db/queries';
import { logActivity } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const team = await getTeamForUser();
    if (!team) {
      return Response.json({ error: 'No team found' }, { status: 404 });
    }

    const teamEvents = await getEventsForTeam(team.id);
    return Response.json(teamEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    return Response.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const team = await getTeamForUser();
    if (!team) {
      return Response.json({ error: 'No team found' }, { status: 404 });
    }

    const body = await request.json();
  const { name, description, eventDate, location, isPublic, allowGuestUploads } = body;

    if (!name) {
      return Response.json({ error: 'Event name is required' }, { status: 400 });
    }

    const [newEvent] = await db.insert(events).values({
      name,
      description,
      createdBy: user.id,
      teamId: team.id,
      date: eventDate ? new Date(eventDate) : new Date(),
      location,
      isPublic: !!isPublic,
      allowGuestUploads: allowGuestUploads !== false, // Default to true
      accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    }).returning();

    // Log activity
    await logActivity(team.id, user.id, ActivityType.CREATE_EVENT);

    return Response.json(newEvent, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return Response.json({ error: 'Failed to create event' }, { status: 500 });
  }
}