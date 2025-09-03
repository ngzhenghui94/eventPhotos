import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const clean = (v?: string) => v?.trim().replace(/^['"]|['"]$/g, '');

// Hetzner S3 configuration
const ENDPOINT = clean(process.env.HETZNER_S3_ENDPOINT);
const REGION = clean(process.env.HETZNER_S3_REGION || 'eu-central-1')!;
const ACCESS_KEY_ID = clean(process.env.HETZNER_S3_ACCESS_KEY);
const SECRET_ACCESS_KEY = clean(process.env.HETZNER_S3_SECRET_KEY);

const s3Client = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  forcePathStyle: true, // Hetzner requires path-style URLs
  credentials: { accessKeyId: ACCESS_KEY_ID!, secretAccessKey: SECRET_ACCESS_KEY! },
});

const BUCKET_NAME = clean(process.env.HETZNER_S3_BUCKET);

function ensureConfigured() {
  const missing: string[] = [];
  if (!process.env.HETZNER_S3_BUCKET) missing.push('HETZNER_S3_BUCKET');
  if (!process.env.HETZNER_S3_REGION) missing.push('HETZNER_S3_REGION');
  if (!ACCESS_KEY_ID) missing.push('HETZNER_S3_ACCESS_KEY');
  if (!SECRET_ACCESS_KEY) missing.push('HETZNER_S3_SECRET_KEY');
  if (!ENDPOINT) missing.push('HETZNER_S3_ENDPOINT');
  if (missing.length) {
    throw new Error(
      `S3 is not configured. Missing environment variables: ${missing.join(', ')}. Add them to .env.local and restart the server.`
    );
  }
}

export async function uploadToS3(key: string, file: Buffer, contentType: string): Promise<string> {
  ensureConfigured();
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return key;
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600,
  options?: { contentDisposition?: string }
): Promise<string> {
  ensureConfigured();
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ...(options?.contentDisposition ? { ResponseContentDisposition: options.contentDisposition } : {}),
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function getSignedUploadUrl(key: string, contentType?: string, expiresIn: number = 3600): Promise<string> {
  ensureConfigured();
  // Do not include ContentType in the signed request to avoid client/server header mismatches.
  // The browser can still send Content-Type and S3 will store it as object metadata.
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    // Intentionally omit ContentType from the signature
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteFromS3(key: string): Promise<void> {
  ensureConfigured();
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

export function generatePhotoKey(eventId: number, fileName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = fileName.split('.').pop();
  return `events/${eventId}/photos/${timestamp}-${randomString}.${extension}`;
}

export function deriveThumbKey(originalKey: string, size: 'sm' | 'md' = 'sm'): string {
  const lastSlash = originalKey.lastIndexOf('/');
  const dir = originalKey.substring(0, lastSlash);
  const file = originalKey.substring(lastSlash + 1);
  return `${dir}/thumbs/${size}-${file}`;
}