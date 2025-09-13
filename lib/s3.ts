import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, type ListObjectsV2CommandOutput, _Object } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const clean = (v?: string) => v?.trim().replace(/^['"]|['"]$/g, '');

// Hetzner S3 configuration
const ENDPOINT = clean(process.env.HETZNER_S3_ENDPOINT);
const REGION = clean(process.env.HETZNER_S3_REGION || 'eu-central-1')!;
const ACCESS_KEY_ID = clean(process.env.HETZNER_S3_ACCESS_KEY);
const SECRET_ACCESS_KEY = clean(process.env.HETZNER_S3_SECRET_KEY);
const BUCKET_NAME = clean(process.env.HETZNER_S3_BUCKET);

// Singleton S3 client instance
let s3Client: S3Client | null = null;
let configValidated = false;

function getS3Client(): S3Client {
  if (!s3Client) {
    ensureConfigured(); // Only validate config once
    s3Client = new S3Client({
      region: REGION,
      endpoint: ENDPOINT,
      forcePathStyle: true, // Hetzner requires path-style URLs
      credentials: { accessKeyId: ACCESS_KEY_ID!, secretAccessKey: SECRET_ACCESS_KEY! },
    });
  }
  return s3Client;
}

function ensureConfigured(): void {
  if (configValidated) return;
  
  const missing: string[] = [];
  if (!BUCKET_NAME) missing.push('HETZNER_S3_BUCKET');
  if (!REGION) missing.push('HETZNER_S3_REGION');
  if (!ACCESS_KEY_ID) missing.push('HETZNER_S3_ACCESS_KEY');
  if (!SECRET_ACCESS_KEY) missing.push('HETZNER_S3_SECRET_KEY');
  if (!ENDPOINT) missing.push('HETZNER_S3_ENDPOINT');
  
  if (missing.length) {
    throw new Error(
      `S3 is not configured. Missing environment variables: ${missing.join(', ')}. Add them to .env.local and restart the server.`
    );
  }
  
  configValidated = true;
}

export async function uploadToS3(key: string, file: Buffer, contentType: string): Promise<string> {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await client.send(command);
  return key;
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600,
  options?: { contentDisposition?: string }
): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ...(options?.contentDisposition ? { ResponseContentDisposition: options.contentDisposition } : {}),
  });

  return await getSignedUrl(client, command, { expiresIn });
}

export async function getSignedUploadUrl(key: string, contentType?: string, expiresIn: number = 3600): Promise<string> {
  const client = getS3Client();
  // Do not include ContentType in the signed request to avoid client/server header mismatches.
  // The browser can still send Content-Type and S3 will store it as object metadata.
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    // Intentionally omit ContentType from the signature
  });

  return await getSignedUrl(client, command, { expiresIn });
}

export async function deleteFromS3(key: string): Promise<void> {
  const client = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await client.send(command);
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

export type S3ObjectInfo = { key: string; size: number; lastModified?: Date };

export async function listAllObjects(prefix?: string): Promise<S3ObjectInfo[]> {
  const client = getS3Client();
  let continuationToken: string | undefined = undefined;
  const out: S3ObjectInfo[] = [];
  do {
    const res: ListObjectsV2CommandOutput = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    }));
    (res.Contents || []).forEach((o) => {
      if (!o || !o.Key) return;
      out.push({ key: o.Key, size: Number(o.Size || 0), lastModified: o.LastModified });
    });
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return out;
}

// Internal helpers for admin routes
export function getS3ClientInternal() {
  return getS3Client();
}

export function getBucketName(): string {
  ensureConfigured();
  return BUCKET_NAME!;
}