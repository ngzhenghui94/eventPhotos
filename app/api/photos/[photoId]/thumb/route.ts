import { NextRequest, NextResponse } from 'next/server';
import { getUser, getPhotoById, canUserAccessEvent } from '@/lib/db/queries';
import { S3Client, HeadObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
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

  if (!photo.filePath?.startsWith('s3:')) {
    // Fall back to original local file
    return NextResponse.redirect(new URL(`/api/photos/${photoId}`, request.url));
  }

  const key = photo.filePath.replace(/^s3:/, '');
  const lastSlash = key.lastIndexOf('/');
  const dir = key.substring(0, lastSlash);
  const file = key.substring(lastSlash + 1);
  const thumbKey = `${dir}/thumbs/sm-${file}`;

  // If thumbnail exists, proxy it from S3 with caching headers.
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: thumbKey }));
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: thumbKey }));
    const body = await obj.Body!.transformToByteArray();
    return new NextResponse(Buffer.from(body), {
      headers: {
        'Content-Type': obj.ContentType || 'image/jpeg',
        // Cache at the edge for 1 day, allow stale revalidate
        'Cache-Control': 'public, s-maxage=86400, max-age=3600, stale-while-revalidate=86400',
      },
    });
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

  return new NextResponse(new Uint8Array(resized), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, s-maxage=86400, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error('thumb generate error', err);
    return NextResponse.redirect(new URL(`/api/photos/${photoId}`, request.url));
  }
}