import { NextRequest, NextResponse } from 'next/server';
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
  const url = new URL(request.url);
  const code = request.headers.get('x-access-code') || url.searchParams.get('code') || null;
  const canAccess = await canUserAccessEvent(photo.eventId, user?.id, code);
    
    if (!canAccess) {
      return Response.json({ error: 'Not authorized to view this photo' }, { status: 403 });
    }

    // If stored on S3 (filePath like 's3:<key>'), redirect to a short-lived signed URL; else redirect to local URL
    const isS3 = photo.filePath?.startsWith('s3:');
    if (isS3) {
      const key = photo.filePath.replace(/^s3:/, '');
      const url = await getSignedDownloadUrl(key, 60);
      return NextResponse.redirect(url);
    }

    // Local fallback
    return NextResponse.redirect(new URL(photo.filePath, request.url));
  } catch (error) {
    console.error('Error fetching photo:', error);
    return Response.json({ error: 'Failed to fetch photo' }, { status: 500 });
  }
}