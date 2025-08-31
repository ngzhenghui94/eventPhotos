import { NextRequest } from 'next/server';
import { getUser, getEventById, getPhotosForEvent, canUserAccessEvent } from '@/lib/db/queries';
import { getSignedDownloadUrl } from '@/lib/s3';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId: eventIdStr } = await context.params;
    const eventId = parseInt(eventIdStr);
    if (!eventId) {
      return Response.json({ error: 'Invalid event ID' }, { status: 400 });
    }

  const user = await getUser();
  const url = new URL(request.url);
  const code = request.headers.get('x-access-code') || url.searchParams.get('code') || null;
  const canAccess = await canUserAccessEvent(eventId, user?.id, code);
    
    if (!canAccess) {
      return Response.json({ error: 'Not authorized to view this event' }, { status: 403 });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

  const rawPhotos = await getPhotosForEvent(eventId);

  // Map file paths: if S3 key, provide signed URL via /api/photos/[id] for viewing
  const photos = await Promise.all(
    rawPhotos.map(async (p) => {
      if (p.filePath?.startsWith('s3:')) {
        // We will not expose the raw signed URL here; the client will call /api/photos/[id]
        // which now redirects to a short-lived signed S3 URL after authorization checks.
        return {
          ...p,
          // Keep a placeholder; frontends will use /api/photos/:id
          filePath: `/api/photos/${p.id}`,
        };
      }
      return p;
    })
  );

    return Response.json({
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        eventDate: event.date,
        location: event.location,
        isPublic: event.isPublic,
        allowGuestUploads: event.allowGuestUploads,
        owner: event.createdBy,
      },
      photos,
    });
  } catch (error) {
    console.error('Error fetching event photos:', error);
    return Response.json({ error: 'Failed to fetch event photos' }, { status: 500 });
  }
}