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
    const canAccess = await canUserAccessEvent(photo.eventId, { userId: user?.id });
    
    if (!canAccess) {
      return Response.json({ error: 'Not authorized to view this photo' }, { status: 403 });
    }

    const isS3 = photo.filePath?.startsWith('s3:');
    if (isS3) {
      const key = photo.filePath.replace(/^s3:/, '');
      const url = await getSignedDownloadUrl(key, 60);
      return Response.json({
        id: photo.id,
        originalName: photo.originalFilename,
        url,
        mimeType: photo.mimeType,
        fileSize: photo.fileSize,
        createdAt: photo.uploadedAt,
      });
    }

    return Response.json({
      id: photo.id,
      originalName: photo.originalFilename,
      url: photo.filePath,
      mimeType: photo.mimeType,
      fileSize: photo.fileSize,
      createdAt: photo.uploadedAt,
    });
  } catch (error) {
    console.error('Error fetching photo metadata:', error);
    return Response.json({ error: 'Failed to fetch photo metadata' }, { status: 500 });
  }
}
