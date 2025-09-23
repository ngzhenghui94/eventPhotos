import { NextRequest, NextResponse } from 'next/server';
import { getPhotoById, canUserAccessEvent, getUser, getEventById } from '@/lib/db/queries';
import { redis } from '@/lib/upstash';
import { S3Client, HeadObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { PHOTO_META_TTL_SECONDS, SIGNED_URL_TTL_SECONDS, SIGNED_URL_REDIS_MIRROR_SECONDS, THUMBNAIL_CACHE_CONTROL, THUMB_EXISTS_TTL_SECONDS } from '@/lib/config/cache';
import { cookies } from 'next/headers';
// derive thumb key locally to avoid module hot-reload issues

const clean = (v?: string) => v?.trim().replace(/^['"]|['"]$/g, '');
const REGION = clean(process.env.HETZNER_S3_REGION || 'eu-central-1')!;
const ACCESS_KEY_ID = clean(process.env.HETZNER_S3_ACCESS_KEY);
const SECRET_ACCESS_KEY = clean(process.env.HETZNER_S3_SECRET_KEY);
const ENDPOINT = clean(process.env.HETZNER_S3_ENDPOINT);
const BUCKET_NAME = clean(process.env.HETZNER_S3_BUCKET);

// Coerce to https in production to avoid mixed-content blocked images
const endpointToUse = (process.env.NODE_ENV === 'production' && typeof ENDPOINT === 'string')
  ? ENDPOINT.replace(/^http:\/\//, 'https://')
  : ENDPOINT;
const s3 = new S3Client({
  region: REGION,
  endpoint: endpointToUse,
  forcePathStyle: true,
  credentials: { accessKeyId: ACCESS_KEY_ID!, secretAccessKey: SECRET_ACCESS_KEY! },
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  const t0 = Date.now();
  const { photoId: photoIdStr } = await context.params;
  const photoId = parseInt(photoIdStr);
  if (!photoId) return NextResponse.json({ error: 'Invalid photo ID' }, { status: 400 });
  try { console.info('[api][thumb][start]', { photoId }); } catch {}

  type PhotoMeta = { eventId: number; s3Key: string | null; filePath: string | null };
  const cacheKey = `photo:meta:${photoId}`;
  // We store format-specific URL mirrors for better client bytes (webp/jpeg)
  const accept = request.headers.get('accept') || '';
  const wantsModern = /image\/avif|image\/webp/.test(accept);
  const fmt = wantsModern ? 'webp' : 'jpeg';
  const urlCacheKey = `photo:thumb:url:${photoId}:${fmt}`;
  // Fast path: short-lived cached signed URL
  try {
    const cachedUrl = await redis.get<string>(urlCacheKey);
    if (cachedUrl) {
      try { console.info('[api][thumb][cache-hit-url]', { photoId, ms: Date.now() - t0 }); } catch {}
      return NextResponse.redirect(cachedUrl, {
        headers: {
          'Cache-Control': 'private, max-age=60',
          'Vary': 'Accept',
        },
      });
    }
  } catch {}
  let meta = await redis.get<PhotoMeta>(cacheKey);
  if (!meta) {
    const photo = await getPhotoById(photoId);
    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    meta = {
      eventId: photo.eventId,
      s3Key: photo.filePath?.startsWith('s3:') ? photo.filePath.replace(/^s3:/, '') : null,
      filePath: photo.filePath ?? null,
    };
  await redis.set(cacheKey, meta, { ex: PHOTO_META_TTL_SECONDS });
    try { console.info('[api][thumb][meta-cache-store]', { photoId, eventId: meta.eventId, hasS3Key: !!meta.s3Key }); } catch {}
  } else {
    try { console.info('[api][thumb][meta-cache-hit]', { photoId, eventId: meta.eventId, hasS3Key: !!meta.s3Key }); } catch {}
  }

  const url = new URL(request.url);
  const codeFromHeader = request.headers.get('x-access-code') || undefined;
  const codeFromQuery = url.searchParams.get('code') || undefined;
  const user = await getUser().catch(() => null);
  // Resolve event to compute cookie key for private events
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
    accessCode: providedCode || undefined,
  });
  try {
    console.info('[api][thumb][auth]', {
      photoId,
      eventId: meta.eventId,
      hasUser: !!user,
      hasCodeCookie: !!codeFromCookie,
      hasCodeHeader: !!codeFromHeader,
      hasCodeQuery: !!codeFromQuery,
      allowed: !!canAccess,
    });
  } catch {}
  if (!canAccess) {
    try { console.warn('[api][thumb][403]', { photoId, eventId: meta.eventId, hasUser: !!user, hasCode: !!(providedCode) }); } catch {}
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!meta.s3Key) {
    // Fall back to original local file
    return NextResponse.redirect(new URL(`/api/photos/${photoId}`, request.url));
  }

  const key = meta.s3Key;
  const lastSlash = key.lastIndexOf('/');
  const dir = key.substring(0, lastSlash);
  const file = key.substring(lastSlash + 1);
  const base = file.replace(/\.[^.]+$/, '');
  const thumbKeyJpeg = `${dir}/thumbs/sm-${file}`; // keep original filename with extension for jpeg variant
  const thumbKeyWebp = `${dir}/thumbs/sm-${base}.webp`;
  let preferredKey = wantsModern ? thumbKeyWebp : thumbKeyJpeg;

  // If thumbnail exists, proxy it from S3 with caching headers.
  // Try HEAD on preferred key; on miss, try fallback format
  try {
    const existsFlag = await redis.get<number>(`photo:thumb:exists:${photoId}:${fmt}`).catch(() => null);
    if (existsFlag !== 1) {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: preferredKey }));
      try { await redis.set(`photo:thumb:exists:${photoId}:${fmt}`, 1, { ex: THUMB_EXISTS_TTL_SECONDS }); } catch {}
    }
    const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET_NAME, Key: preferredKey }), { expiresIn: SIGNED_URL_TTL_SECONDS });
    try { await redis.set(urlCacheKey, signed, { ex: SIGNED_URL_REDIS_MIRROR_SECONDS }); } catch {}
    try {
      const uo = new URL(signed);
      console.info('[api][thumb][exists]', { photoId, eventId: meta.eventId, key: preferredKey, host: `${uo.protocol}//${uo.host}`, ms: Date.now() - t0 });
    } catch { console.info('[api][thumb][exists]', { photoId, eventId: meta.eventId, key: preferredKey, ms: Date.now() - t0 }); }
    return NextResponse.redirect(signed, {
      headers: {
        'Cache-Control': 'private, max-age=60',
        'Vary': 'Accept',
      },
    });
  } catch {
    // If preferred format missing, attempt fallback format if different
    if (preferredKey !== thumbKeyJpeg) {
      try {
        await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: thumbKeyJpeg }));
        const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET_NAME, Key: thumbKeyJpeg }), { expiresIn: SIGNED_URL_TTL_SECONDS });
        try { await redis.set(`photo:thumb:exists:${photoId}:jpeg`, 1, { ex: THUMB_EXISTS_TTL_SECONDS }); } catch {}
        try { await redis.set(`photo:thumb:url:${photoId}:jpeg`, signed, { ex: SIGNED_URL_REDIS_MIRROR_SECONDS }); } catch {}
        return NextResponse.redirect(signed, {
          headers: {
            'Cache-Control': 'private, max-age=60',
            'Vary': 'Accept',
          },
        });
      } catch {}
    }
  }

  // Generate thumbnail on the fly (max 512px)
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    const source = Buffer.from(await obj.Body!.transformToByteArray());
    let out: Buffer;
    let contentType: 'image/webp' | 'image/jpeg';
    let outKey = preferredKey;
    try {
      if (wantsModern) {
        out = await sharp(source).rotate().resize(512, 512, { fit: 'inside' }).webp({ quality: 78 }).toBuffer();
        contentType = 'image/webp';
      } else {
        out = await sharp(source).rotate().resize(512, 512, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
        contentType = 'image/jpeg';
      }
    } catch {
      // Fallback to jpeg on any transform error
      out = await sharp(source).rotate().resize(512, 512, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
      contentType = 'image/jpeg';
      outKey = thumbKeyJpeg;
    }
    try { console.info('[api][thumb][generate]', { photoId, eventId: meta.eventId, outKey, outBytes: out.length }); } catch {}
    // Store back to S3 for future requests (best-effort)
    try {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: outKey,
        Body: out,
        ContentType: contentType,
        CacheControl: THUMBNAIL_CACHE_CONTROL,
      }));
      try { console.info('[api][thumb][stored]', { photoId, key: outKey }); } catch {}
    } catch {}
    const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET_NAME, Key: outKey }), { expiresIn: SIGNED_URL_TTL_SECONDS });
    // Mirror cache under the right format key
    const outFmt = outKey.endsWith('.webp') ? 'webp' : 'jpeg';
    try { await redis.set(`photo:thumb:url:${photoId}:${outFmt}`, signed, { ex: SIGNED_URL_REDIS_MIRROR_SECONDS }); } catch {}
    try { await redis.set(`photo:thumb:exists:${photoId}:${outFmt}`, 1, { ex: THUMB_EXISTS_TTL_SECONDS }); } catch {}
    try {
      const uo = new URL(signed);
      console.info('[api][thumb][signed]', { photoId, eventId: meta.eventId, key: outKey, host: `${uo.protocol}//${uo.host}`, ms: Date.now() - t0 });
    } catch { console.info('[api][thumb][signed]', { photoId, eventId: meta.eventId, key: outKey, ms: Date.now() - t0 }); }
    return NextResponse.redirect(signed, {
      headers: {
        'Cache-Control': 'private, max-age=60',
        'Vary': 'Accept',
      },
    });
  } catch (err) {
    console.error('[api][thumb][error]', { photoId, eventId: meta.eventId, err });
    try { console.info('[api][thumb][fallback-original]', { photoId, eventId: meta.eventId }); } catch {}
    return NextResponse.redirect(new URL(`/api/photos/${photoId}`, request.url), {
      headers: {
        'Cache-Control': 'private, max-age=60',
        'Vary': 'Accept',
      },
    });
  }
}