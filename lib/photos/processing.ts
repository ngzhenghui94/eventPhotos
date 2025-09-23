import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { getS3ClientInternal, getBucketName } from '@/lib/s3';
import { redis } from '@/lib/upstash';
import { SIGNED_URL_REDIS_MIRROR_SECONDS, SIGNED_URL_TTL_SECONDS, THUMBNAIL_CACHE_CONTROL, THUMB_EXISTS_TTL_SECONDS } from '@/lib/config/cache';
import { getSignedDownloadUrl } from '@/lib/s3';

type Item = { photoId: number; s3Key: string };

function deriveThumbKeys(originalKey: string) {
  const lastSlash = originalKey.lastIndexOf('/');
  const dir = originalKey.substring(0, lastSlash);
  const file = originalKey.substring(lastSlash + 1);
  const base = file.replace(/\.[^.]+$/, '');
  const jpegKey = `${dir}/thumbs/sm-${file}`; // keep original extension
  const webpKey = `${dir}/thumbs/sm-${base}.webp`;
  return { jpegKey, webpKey };
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
        const { jpegKey, webpKey } = deriveThumbKeys(s3Key);

        // Generate both variants
        const [jpegBuf, webpBuf] = await Promise.all([
          sharp(source).rotate().resize(512, 512, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer(),
          sharp(source).rotate().resize(512, 512, { fit: 'inside' }).webp({ quality: 78 }).toBuffer(),
        ]);

        // Upload in parallel
        await Promise.allSettled([
          s3.send(new PutObjectCommand({
            Bucket,
            Key: jpegKey,
            Body: jpegBuf,
            ContentType: 'image/jpeg',
            CacheControl: THUMBNAIL_CACHE_CONTROL,
          })),
          s3.send(new PutObjectCommand({
            Bucket,
            Key: webpKey,
            Body: webpBuf,
            ContentType: 'image/webp',
            CacheControl: THUMBNAIL_CACHE_CONTROL,
          })),
        ]);

        // Mark existence to avoid HEAD probes
        try {
          await redis.set(`photo:thumb:exists:${photoId}:jpeg`, 1, { ex: THUMB_EXISTS_TTL_SECONDS });
          await redis.set(`photo:thumb:exists:${photoId}:webp`, 1, { ex: THUMB_EXISTS_TTL_SECONDS });
        } catch {}

        // Optionally warm short-lived signed URL mirrors for faster first load
        try {
          const [jpegUrl, webpUrl] = await Promise.all([
            getSignedDownloadUrl(jpegKey, SIGNED_URL_TTL_SECONDS),
            getSignedDownloadUrl(webpKey, SIGNED_URL_TTL_SECONDS),
          ]);
          await Promise.allSettled([
            redis.set(`photo:thumb:url:${photoId}:jpeg`, jpegUrl, { ex: SIGNED_URL_REDIS_MIRROR_SECONDS }),
            redis.set(`photo:thumb:url:${photoId}:webp`, webpUrl, { ex: SIGNED_URL_REDIS_MIRROR_SECONDS }),
          ]);
        } catch {}
        try { console.info('[thumbs][precompute][ok]', { photoId, jpegKey, webpKey }); } catch {}
      } catch (err) {
        try { console.warn('[thumbs][precompute][fail]', { photoId, s3Key, err }); } catch {}
      }
    })
  );
}
