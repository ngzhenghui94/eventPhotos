import { NextRequest, NextResponse } from 'next/server';
import { getPhotoById, canUserAccessEvent } from '@/lib/db/queries';
import { redis } from '@/lib/upstash';
import { S3Client, HeadObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
// derive thumb key locally to avoid module hot-reload issues

const clean = (v?: string) => v?.trim().replace(/^['"]|['"]$/g, '');
const REGION = clean(process.env.HETZNER_S3_REGION || 'eu-central-1')!;
const ACCESS_KEY_ID = clean(process.env.HETZNER_S3_ACCESS_KEY);
const SECRET_ACCESS_KEY = clean(process.env.HETZNER_S3_SECRET_KEY);
const ENDPOINT = clean(process.env.HETZNER_S3_ENDPOINT);
const BUCKET_NAME = clean(process.env.HETZNER_S3_BUCKET);

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: ACCESS_KEY_ID!, secretAccessKey: SECRET_ACCESS_KEY! },
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  const { photoId: photoIdStr } = await context.params;
  const photoId = parseInt(photoIdStr);
  if (!photoId) return NextResponse.json({ error: 'Invalid photo ID' }, { status: 400 });

  type PhotoMeta = { eventId: number; s3Key: string | null; filePath: string | null };
  const cacheKey = `photo:meta:${photoId}`;
  const urlCacheKey = `photo:thumb:url:${photoId}`;
  // Fast path: short-lived cached signed URL
  try {
    const cachedUrl = await redis.get<string>(urlCacheKey);
    if (cachedUrl) {
      return NextResponse.redirect(cachedUrl);
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
    await redis.set(cacheKey, meta, { ex: 60 * 60 * 24 * 7 });
  }

  const url = new URL(request.url);
  const code = request.headers.get('x-access-code') || url.searchParams.get('code') || null;
  const canAccess = await canUserAccessEvent(meta.eventId, { accessCode: code ?? undefined });
  if (!canAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!meta.s3Key) {
    // Fall back to original local file
    return NextResponse.redirect(new URL(`/api/photos/${photoId}`, request.url));
  }

  const key = meta.s3Key;
  const lastSlash = key.lastIndexOf('/');
  const dir = key.substring(0, lastSlash);
  const file = key.substring(lastSlash + 1);
  const thumbKey = `${dir}/thumbs/sm-${file}`;

  // If thumbnail exists, proxy it from S3 with caching headers.
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: thumbKey }));
    const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET_NAME, Key: thumbKey }), { expiresIn: 600 });
    // Cache URL briefly (just under the signed URL expiry)
    try { await redis.set(urlCacheKey, signed, { ex: 590 }); } catch {}
    return NextResponse.redirect(signed);
  } catch {}

  // Generate thumbnail on the fly (max 512px)
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    const source = Buffer.from(await obj.Body!.transformToByteArray());
    const resized = await sharp(source).rotate().resize(512, 512, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
    // Store back to S3 for future requests (best-effort)
    try {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: thumbKey,
        Body: resized,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      }));
    } catch {}
    const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET_NAME, Key: thumbKey }), { expiresIn: 600 });
    try { await redis.set(urlCacheKey, signed, { ex: 590 }); } catch {}
    return NextResponse.redirect(signed);
  } catch (err) {
    console.error('thumb generate error', err);
    return NextResponse.redirect(new URL(`/api/photos/${photoId}`, request.url));
  }
}