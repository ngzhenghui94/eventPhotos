import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, type ListObjectsV2CommandOutput, _Object } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

const clean = (v?: string) => v?.trim().replace(/^['"]|['"]$/g, '');
const truthy = (v?: string) => {
  const s = clean(v)?.toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === 'on';
};
const first = (...vals: Array<string | undefined>) => vals.find((v) => !!clean(v));

function isDnsCompatibleBucket(bucket: string) {
  // Rough check: lower-case letters, digits, dots and hyphens only.
  // Dots are technically allowed but often break TLS with virtual-hosted style.
  return /^[a-z0-9.-]+$/.test(bucket);
}

function bucketPrefersPathStyle(bucket: string) {
  // If bucket isn't DNS-compatible OR contains dot(s), prefer path-style to avoid TLS/DNS issues.
  if (!bucket) return false;
  if (!isDnsCompatibleBucket(bucket)) return true;
  if (bucket.includes('.')) return true;
  return false;
}

function normalizeEndpoint(rawEndpoint: string | undefined, bucket: string | undefined) {
  if (!rawEndpoint) return rawEndpoint;
  try {
    const u = new URL(rawEndpoint);
    const b = (bucket || '').toLowerCase();
    // Common misconfig: user sets S3_ENDPOINT to "https://<bucket>.s3.<region>...."
    // but the SDK will *also* prepend bucket for virtual-hosted style.
    if (b && u.hostname.toLowerCase().startsWith(`${b}.`)) {
      u.hostname = u.hostname.slice(b.length + 1);
    }
    // Normalize trailing slash
    u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString();
  } catch {
    return rawEndpoint;
  }
}

/**
 * S3-compatible storage configuration.
 *
 * Preferred envs (provider-agnostic):
 * - S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET
 * Optional:
 * - S3_FORCE_PATH_STYLE=true|false (Hetzner typically needs true; Backblaze B2 usually works with false)
 *
 * Backward-compatible envs (legacy):
 * - HETZNER_S3_ENDPOINT, HETZNER_S3_REGION, HETZNER_S3_ACCESS_KEY, HETZNER_S3_SECRET_KEY, HETZNER_S3_BUCKET
 */
const BUCKET_NAME = clean(first(process.env.S3_BUCKET, process.env.HETZNER_S3_BUCKET));
const ENDPOINT = clean(normalizeEndpoint(first(process.env.S3_ENDPOINT, process.env.HETZNER_S3_ENDPOINT), BUCKET_NAME));
const REGION = clean(first(process.env.S3_REGION, process.env.HETZNER_S3_REGION, 'eu-central-1'))!;
const ACCESS_KEY_ID = clean(first(process.env.S3_ACCESS_KEY_ID, process.env.S3_ACCESS_KEY, process.env.HETZNER_S3_ACCESS_KEY));
const SECRET_ACCESS_KEY = clean(first(process.env.S3_SECRET_ACCESS_KEY, process.env.S3_SECRET_KEY, process.env.HETZNER_S3_SECRET_KEY));
const FORCE_PATH_STYLE =
  typeof process.env.S3_FORCE_PATH_STYLE === 'string'
    ? truthy(process.env.S3_FORCE_PATH_STYLE)
    : // Default: if legacy Hetzner envs are used (and S3_* not set), preserve prior behavior
      ((!!clean(process.env.HETZNER_S3_ENDPOINT) && !clean(process.env.S3_ENDPOINT)) || (!!BUCKET_NAME && bucketPrefersPathStyle(BUCKET_NAME)));

// Singleton S3 client instance
let s3Client: S3Client | null = null;
let configValidated = false;

function getS3Client(): S3Client {
  if (!s3Client) {
    ensureConfigured(); // Only validate config once
    // Useful runtime hints for common misconfigurations
    try {
      if (BUCKET_NAME && bucketPrefersPathStyle(BUCKET_NAME) && typeof process.env.S3_FORCE_PATH_STYLE !== 'string') {
        console.warn('[s3][config] Bucket name suggests path-style URLs (dots/uppercase/underscores). Using forcePathStyle=true for compatibility.', { bucket: BUCKET_NAME });
      }
    } catch {}
    try {
      if (process.env.NODE_ENV === 'production' && typeof ENDPOINT === 'string' && ENDPOINT.startsWith('http://')) {
        console.warn('[s3][config] Using http endpoint in production may break browser uploads due to mixed content. Consider switching S3_ENDPOINT to https. Current:', ENDPOINT);
      }
    } catch {}
    // In production, coerce any http endpoint to https to avoid mixed-content when generating presigned URLs
    const endpointToUse = (process.env.NODE_ENV === 'production' && typeof ENDPOINT === 'string')
      ? ENDPOINT.replace(/^http:\/\//, 'https://')
      : ENDPOINT;
    s3Client = new S3Client({
      region: REGION,
      endpoint: endpointToUse,
      forcePathStyle: FORCE_PATH_STYLE,
      credentials: { accessKeyId: ACCESS_KEY_ID!, secretAccessKey: SECRET_ACCESS_KEY! },
      requestHandler: new NodeHttpHandler({
        httpAgent: new HttpAgent({ keepAlive: true, keepAliveMsecs: 1000 }),
        httpsAgent: new HttpsAgent({ keepAlive: true, keepAliveMsecs: 1000 }),
      }),
    });
  }
  return s3Client;
}

function ensureConfigured(): void {
  if (configValidated) return;
  
  const missing: string[] = [];
  if (!BUCKET_NAME) missing.push('S3_BUCKET');
  if (!REGION) missing.push('S3_REGION');
  if (!ACCESS_KEY_ID) missing.push('S3_ACCESS_KEY_ID');
  if (!SECRET_ACCESS_KEY) missing.push('S3_SECRET_ACCESS_KEY');
  if (!ENDPOINT) missing.push('S3_ENDPOINT');
  
  if (missing.length) {
    throw new Error(
      `S3 is not configured. Missing environment variables: ${missing.join(', ')}. Add them to .env.local and restart the server. (Legacy HETZNER_S3_* envs are also supported.)`
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

export async function deleteManyFromS3(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const client = getS3Client();
  const chunkSize = 1000; // S3 deleteObjects limit

  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    const command = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: chunk.map(k => ({ Key: k })),
        Quiet: true,
      },
    });
    await client.send(command);
  }
}

// Enhanced bulk delete with granular error capture & per-key fallback if a chunk fails
export async function deleteManyFromS3Detailed(keys: string[]): Promise<{ deleted: string[]; errors: { key: string; error: string }[] }> {
  const deleted: string[] = [];
  const errors: { key: string; error: string }[] = [];
  if (!keys.length) return { deleted, errors };

  // Normalize keys: trim & dedupe
  const uniqueKeys = Array.from(new Set(keys.map(k => k.trim()).filter(k => k.length > 0)));
  const client = getS3Client();
  const chunkSize = 500; // a bit smaller than limit for safety

  for (let i = 0; i < uniqueKeys.length; i += chunkSize) {
    const chunk = uniqueKeys.slice(i, i + chunkSize);
    const command = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: chunk.map(k => ({ Key: k })),
        Quiet: false, // we want the Deleted / Errors arrays
      },
    });
    try {
      const res: any = await client.send(command);
      if (Array.isArray(res?.Deleted)) {
        for (const d of res.Deleted) if (d?.Key) deleted.push(d.Key);
      }
      if (Array.isArray(res?.Errors) && res.Errors.length) {
        // If we got specific errors, record them and continue
        for (const er of res.Errors) {
          if (er?.Key) errors.push({ key: er.Key, error: er?.Message || 'Unknown error' });
        }
      }
    } catch (chunkErr: any) {
      // Fallback to per-key deletes for this chunk to identify offenders
      for (const key of chunk) {
        try {
          await client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
          deleted.push(key);
        } catch (singleErr: any) {
          errors.push({ key, error: singleErr?.message || 'Delete failed' });
        }
      }
    }
  }
  return { deleted, errors };
}

export function generatePhotoKey(eventId: number, fileName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = fileName.split('.').pop();
  return `events/${eventId}/photos/${timestamp}-${randomString}.${extension}`;
}

export function deriveThumbKey(originalKey: string, size: 'sm' | 'md' = 'sm'): string {
  // Normalize possible s3: prefix
  const key = originalKey.startsWith('s3:') ? originalKey.slice(3) : originalKey;
  const lastSlash = key.lastIndexOf('/');
  const dir = key.substring(0, lastSlash);
  const file = key.substring(lastSlash + 1);
  const base = file.replace(/\.[^.]+$/, '');
  // WebP-only thumbnails
  return `${dir}/thumbs/${size}-${base}.webp`;
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