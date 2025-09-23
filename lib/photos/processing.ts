import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { getS3ClientInternal, getBucketName } from '@/lib/s3';
import { redis } from '@/lib/upstash';
import { SIGNED_URL_REDIS_MIRROR_SECONDS, SIGNED_URL_TTL_SECONDS, THUMBNAIL_CACHE_CONTROL, THUMB_EXISTS_TTL_SECONDS } from '@/lib/config/cache';
import { getSignedDownloadUrl } from '@/lib/s3';

type Item = { photoId: number; s3Key: string };

function deriveThumbKeyWebp(originalKey: string) {
  const key = originalKey.startsWith('s3:') ? originalKey.slice(3) : originalKey;
  const lastSlash = key.lastIndexOf('/');
  const dir = key.substring(0, lastSlash);
  const file = key.substring(lastSlash + 1);
  const base = file.replace(/\.[^.]+$/, '');
  return `${dir}/thumbs/sm-${base}.webp`;
}

export async function precomputeThumbsForUploadedPhotos(items: Item[]): Promise<void> {
  if (!Array.isArray(items) || items.length === 0) return;
  const s3 = getS3ClientInternal();
  const Bucket = getBucketName();

  await Promise.allSettled(
    items.map(async ({ photoId, s3Key }) => {
      try {
        const obj = await s3.send(new GetObjectCommand({ Bucket, Key: s3Key }));
        const source = Buffer.from(await obj.Body!.transformToByteArray());
        const webpKey = deriveThumbKeyWebp(s3Key);
        const webpBuf = await sharp(source).rotate().resize(512, 512, { fit: 'inside' }).webp({ quality: 78 }).toBuffer();
        await s3.send(new PutObjectCommand({
          Bucket,
          Key: webpKey,
          Body: webpBuf,
          ContentType: 'image/webp',
          CacheControl: THUMBNAIL_CACHE_CONTROL,
        }));

        // Mark existence to avoid HEAD probes
        try {
          await redis.set(`photo:thumb:exists:${photoId}:webp`, 1, { ex: THUMB_EXISTS_TTL_SECONDS });
        } catch {}

        // Optionally warm short-lived signed URL mirrors for faster first load
        try {
          const webpUrl = await getSignedDownloadUrl(webpKey, SIGNED_URL_TTL_SECONDS);
          await redis.set(`photo:thumb:url:${photoId}:webp`, webpUrl, { ex: SIGNED_URL_REDIS_MIRROR_SECONDS });
        } catch {}
        try { console.info('[thumbs][precompute][ok]', { photoId, webpKey }); } catch {}
      } catch (err) {
        try { console.warn('[thumbs][precompute][fail]', { photoId, s3Key, err }); } catch {}
      }
    })
  );
}
