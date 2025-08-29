import { NextRequest } from 'next/server';
import { getUser, getPhotoById, canUserAccessEvent } from '@/lib/db/queries';
import { getSignedDownloadUrl } from '@/lib/s3';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId: photoIdStr } = await context.params;
    const photoId = parseInt(photoIdStr);
    if (!photoId) {
      return Response.json({ error: 'Invalid photo ID' }, { status: 400 });
    }

    const photo = await getPhotoById(photoId);
    if (!photo) {
      return Response.json({ error: 'Photo not found' }, { status: 404 });
    }

    const user = await getUser();
    const canAccess = await canUserAccessEvent(photo.eventId, user?.id);
    
    if (!canAccess) {
      return Response.json({ error: 'Not authorized to view this photo' }, { status: 403 });
    }

    // Generate signed URL for the photo
    const signedUrl = await getSignedDownloadUrl(photo.s3Key, 3600); // 1 hour expiry

    return Response.json({
      id: photo.id,
      originalName: photo.originalName,
      url: signedUrl,
      mimeType: photo.mimeType,
      fileSize: photo.fileSize,
      width: photo.width,
      height: photo.height,
      uploaderName: photo.uploaderName,
      uploaderEmail: photo.uploaderEmail,
      createdAt: photo.createdAt,
    });
  } catch (error) {
    console.error('Error fetching photo:', error);
    return Response.json({ error: 'Failed to fetch photo' }, { status: 500 });
  }
}