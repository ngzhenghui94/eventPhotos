import { NextRequest, NextResponse } from 'next/server';
import { getUser, getPhotoById, canUserAccessEvent, getEventById } from '@/lib/db/queries';
import { getSignedDownloadUrl } from '@/lib/s3';
import { redis } from '@/lib/upstash';
import { cookies } from 'next/headers';
import { PHOTO_META_TTL_SECONDS, SIGNED_URL_TTL_SECONDS, SIGNED_URL_REDIS_MIRROR_SECONDS } from '@/lib/config/cache';

type PhotoMeta = { eventId: number; s3Key: string | null; filePath: string | null };

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
  await redis.set(cacheKey, meta, { ex: PHOTO_META_TTL_SECONDS });
    }

  const user = await getUser();
  const url = new URL(request.url);
  const codeFromHeader = request.headers.get('x-access-code') || undefined;
  const codeFromQuery = url.searchParams.get('code') || undefined;
  let codeFromCookie: string | undefined;
  try {
    const ev = await getEventById(meta.eventId);
    if (ev?.eventCode) {
      const cookieKey = `evt:${ev.eventCode}:access`;
      codeFromCookie = (await cookies()).get(cookieKey)?.value?.toUpperCase().trim();
    }
  } catch {}
  const providedCode = (codeFromCookie || codeFromHeader || codeFromQuery)?.toUpperCase().trim();
  const canAccess = await canUserAccessEvent(meta.eventId, { 
    userId: user?.id, 
    accessCode: providedCode || undefined 
  });
    
    if (!canAccess) {
      return Response.json({ error: 'Not authorized to view this photo' }, { status: 403 });
    }

    // If stored on S3 (filePath like 's3:<key>'), redirect to a short-lived signed URL; else redirect to local URL
    const isS3 = !!meta.s3Key;
    if (isS3 && meta.s3Key) {
      const urlCacheKey = `photo:url:${photoId}`;
    const cached = await redis.get<string>(urlCacheKey).catch(() => null);
    if (cached) return NextResponse.redirect(cached, { headers: { 'Cache-Control': 'private, max-age=60' } });
  const signed = await getSignedDownloadUrl(meta.s3Key, SIGNED_URL_TTL_SECONDS);
  try { await redis.set(urlCacheKey, signed, { ex: SIGNED_URL_REDIS_MIRROR_SECONDS }); } catch {}
  return NextResponse.redirect(signed, { headers: { 'Cache-Control': 'private, max-age=60' } });
    }

    // Local fallback
    if (meta.filePath) {
      return NextResponse.redirect(new URL(meta.filePath, request.url), { headers: { 'Cache-Control': 'private, max-age=60' } });
    }
    return Response.json({ error: 'File path missing' }, { status: 500 });
  } catch (error) {
    console.error('Error fetching photo:', error);
    return Response.json({ error: 'Failed to fetch photo' }, { status: 500 });
  }
}