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
    const canAccess = await canUserAccessEvent(eventId, user?.id);
    
    if (!canAccess) {
      return Response.json({ error: 'Not authorized to view this event' }, { status: 403 });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const photos = await getPhotosForEvent(eventId);

    // Generate signed URLs for all photos
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const signedUrl = await getSignedDownloadUrl(photo.s3Key, 3600);
        return {
          ...photo,
          url: signedUrl,
        };
      })
    );

    return Response.json({
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        eventDate: event.eventDate,
        location: event.location,
        isPublic: event.isPublic,
        allowGuestUploads: event.allowGuestUploads,
        owner: event.owner,
      },
      photos: photosWithUrls,
    });
  } catch (error) {
    console.error('Error fetching event photos:', error);
    return Response.json({ error: 'Failed to fetch event photos' }, { status: 500 });
  }
}