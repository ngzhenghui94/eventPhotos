import { NextRequest } from 'next/server';
import { getUser, getUserEvents } from '@/lib/db/queries';
import { cacheWrap } from '@/lib/utils/cache';
import { USER_EVENTS_LIST_TTL_SECONDS } from '@/lib/config/cache';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

  const data = await cacheWrap(`user:${user.id}:events:list:v3`, USER_EVENTS_LIST_TTL_SECONDS, async () => {
      // Fetch all events the user owns or is a member of, including photo counts
      const rows = await getUserEvents(user.id);
      return rows;
    });

    return Response.json(data, { status: 200 });
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

  // Teams feature removed; event creation is disabled
  return Response.json({ error: 'Event creation is disabled' }, { status: 403 });
  } catch (error) {
    console.error('Error creating event:', error);
    return Response.json({ error: 'Failed to create event' }, { status: 500 });
  }
}