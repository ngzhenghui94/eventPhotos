import { NextRequest, NextResponse } from 'next/server';
import { getUser, getPhotoById, canUserAccessEvent } from '@/lib/db/queries';
import { getSignedDownloadUrl } from '@/lib/s3';
import { redis } from '@/lib/upstash';

type PhotoMeta = { eventId: number; s3Key: string | null; filePath: string | null };
const META_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

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

    const cacheKey = `photo:meta:${photoId}`;
    let meta = await redis.get<PhotoMeta>(cacheKey);
    if (!meta) {
      const photo = await getPhotoById(photoId);
      if (!photo) {
        return Response.json({ error: 'Photo not found' }, { status: 404 });
      }
      meta = {
        eventId: photo.eventId,
        s3Key: photo.filePath?.startsWith('s3:') ? photo.filePath.replace(/^s3:/, '') : null,
        filePath: photo.filePath ?? null,
      };
      await redis.set(cacheKey, meta, { ex: META_TTL_SECONDS });
    }

  const user = await getUser();
  const url = new URL(request.url);
  const code = request.headers.get('x-access-code') || url.searchParams.get('code') || null;
  const canAccess = await canUserAccessEvent(meta.eventId, { 
    userId: user?.id, 
    accessCode: code ?? undefined 
  });
    
    if (!canAccess) {
      return Response.json({ error: 'Not authorized to view this photo' }, { status: 403 });
    }

    // If stored on S3 (filePath like 's3:<key>'), redirect to a short-lived signed URL; else redirect to local URL
    const isS3 = !!meta.s3Key;
    if (isS3 && meta.s3Key) {
      const urlCacheKey = `photo:url:${photoId}`;
      const cached = await redis.get<string>(urlCacheKey).catch(() => null);
      if (cached) return NextResponse.redirect(cached);
      const url = await getSignedDownloadUrl(meta.s3Key, 120);
      try { await redis.set(urlCacheKey, url, { ex: 110 }); } catch {}
      return NextResponse.redirect(url);
    }

    // Local fallback
    if (meta.filePath) {
      return NextResponse.redirect(new URL(meta.filePath, request.url));
    }
    return Response.json({ error: 'File path missing' }, { status: 500 });
  } catch (error) {
    console.error('Error fetching photo:', error);
    return Response.json({ error: 'Failed to fetch photo' }, { status: 500 });
  }
}