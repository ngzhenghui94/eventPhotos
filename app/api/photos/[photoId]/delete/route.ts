import { NextRequest, NextResponse } from 'next/server';
import { getUser, getPhotoById, canUserAccessEvent, getEventById } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { photos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deleteFromS3 } from '@/lib/s3';
import { redis } from '@/lib/upstash';
import { bumpEventVersion } from '@/lib/utils/cache';
import { getEventStatsCached, setEventStatsCached } from '@/lib/utils/cache';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { photoId: photoIdStr } = await context.params;
  const photoId = parseInt(photoIdStr, 10);
  if (isNaN(photoId)) {
    return NextResponse.json({ error: 'Invalid photo ID' }, { status: 400 });
  }

  const photo = await getPhotoById(photoId);
  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  const canAccess = await canUserAccessEvent(photo.eventId, { userId: user.id });
  if (!canAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (photo.filePath?.startsWith('s3:')) {
    const key = photo.filePath.replace(/^s3:/, '');
    await deleteFromS3(key);
  }

  await db.delete(photos).where(eq(photos.id, photoId));
  // Invalidate via version bump and clear per-photo and owner list caches
  try {
    await Promise.all([
      bumpEventVersion(photo.eventId),
      // clear per-photo caches
      redis.del(`photo:meta:${photoId}`),
      redis.del(`photo:url:${photoId}`),
      redis.del(`photo:thumb:url:${photoId}`),
    ]);
    const event = await getEventById(photo.eventId);
    if (event) {
      await redis.del(`user:${event.createdBy}:events:list:v2`);
    }
    // Warm/update stats: total -1 and approved -1 if was approved
    try {
      const prev = await getEventStatsCached(photo.eventId);
      if (prev) {
        const next = {
          ...prev,
          totalPhotos: Math.max(0, prev.totalPhotos - 1),
          approvedPhotos: photo.isApproved ? Math.max(0, prev.approvedPhotos - 1) : prev.approvedPhotos,
          pendingApprovals: Math.max(0, (Math.max(0, prev.totalPhotos - 1)) - (photo.isApproved ? Math.max(0, prev.approvedPhotos - 1) : prev.approvedPhotos)),
        };
        await setEventStatsCached(photo.eventId, next);
      }
    } catch {}
  } catch {}

  return NextResponse.json({ success: true });
}
