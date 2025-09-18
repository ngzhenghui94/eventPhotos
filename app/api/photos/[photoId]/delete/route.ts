import { NextRequest, NextResponse } from 'next/server';
import { getUser, getPhotoById, canUserAccessEvent } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { photos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deleteFromS3 } from '@/lib/s3';

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

  return NextResponse.json({ success: true });
}
