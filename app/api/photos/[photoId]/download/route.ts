import { NextRequest, NextResponse } from 'next/server';
import { getUser, getPhotoById, canUserAccessEvent } from '@/lib/db/queries';
import { getSignedDownloadUrl } from '@/lib/s3';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  const { photoId: photoIdStr } = await context.params;
  const photoId = parseInt(photoIdStr);
  if (!photoId) return NextResponse.json({ error: 'Invalid photo ID' }, { status: 400 });

  const photo = await getPhotoById(photoId);
  if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

  const user = await getUser();
  const url = new URL(request.url);
  const code = request.headers.get('x-access-code') || url.searchParams.get('code') || null;
  const canAccess = await canUserAccessEvent(photo.eventId, { 
    userId: user?.id, 
    accessCode: code ?? undefined 
  });
  if (!canAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (photo.filePath?.startsWith('s3:')) {
    const key = photo.filePath.replace(/^s3:/, '');
    const url = await getSignedDownloadUrl(key, 60, {
      contentDisposition: `attachment; filename="${encodeURIComponent(photo.originalFilename)}"`
    });
    return NextResponse.redirect(url);
  }

  // Local fallback
  return NextResponse.redirect(new URL(photo.filePath, request.url));
}
