import { NextRequest, NextResponse } from 'next/server';
import { getUser, getPhotoById, canUserAccessEvent, logActivity } from '@/lib/db/queries';
import { getSignedDownloadUrl } from '@/lib/s3';
import { ActivityType } from '@/lib/db/schema';
import { bumpEventVersion } from '@/lib/utils/cache';

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

  // Best-effort: log download activity and invalidate stats cache via event version bump
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined;
  try {
    await logActivity({
      userId: user?.id ?? null,
      eventId: photo.eventId,
      action: ActivityType.DOWNLOAD_PHOTO,
      ipAddress: ip,
      detail: `Downloaded photo '${photo.originalFilename || photo.filename}' (id ${photo.id}) from event ${photo.eventId}`,
    });
    await bumpEventVersion(photo.eventId);
  } catch {}

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
