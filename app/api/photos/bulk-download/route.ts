// Simple in-memory rate limit: 5 bulk downloads per IP per hour
const bulkDownloadRateMap = new Map<string, { count: number; resetAt: number }>();
function rateLimitBulkDownload(ip: string | null | undefined) {
  if (!ip) return { ok: true };
  const now = Date.now();
  const rec = bulkDownloadRateMap.get(ip);
  if (!rec || rec.resetAt < now) {
    bulkDownloadRateMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return { ok: true };
  }
  if (rec.count >= 5) return { ok: false, retryAt: rec.resetAt } as const;
  rec.count += 1;
  return { ok: true } as const;
}
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Allow longer execution for large zips (Vercel/Next-specific hint)
export const maxDuration = 300; // seconds
import { Readable } from 'stream';
import { getPhotoById, canUserAccessEvent, getUser, logActivity } from '@/lib/db/queries';
import { getSignedDownloadUrl, getS3ClientInternal, getBucketName } from '@/lib/s3';
import { ActivityType } from '@/lib/db/schema';
import { bumpEventVersion } from '@/lib/utils/cache';
import { SIGNED_URL_TTL_SECONDS } from '@/lib/config/cache';

export async function POST(request: NextRequest) {
  try {
    // Get IP address (works for Vercel/Next.js edge, fallback to headers)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
    const rate = rateLimitBulkDownload(ip);
    if (!rate.ok) {
      const retryAfter = rate.retryAt ? Math.ceil((rate.retryAt - Date.now()) / 1000) : 3600;
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

  const { photoIds, accessCode } = await request.json();
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: 'No photo IDs provided' }, { status: 400 });
    }
    const user = await getUser();
  const s3 = getS3ClientInternal();
    const bucket = getBucketName();
    let totalBytes = 0;
    let eventIdForActivity: number | null = null;

    // Create archiver instance for streaming zip
  const { default: createArchiver } = await import('archiver');
  const archive = createArchiver('zip', { zlib: { level: 0 } }); // STORE (no compression) for speed and lower CPU
  archive.on('warning', () => {});
  archive.on('error', () => {});

    // Start preparing entries sequentially to avoid long-lived idle sockets
    (async () => {
      try {
        for (const photoId of photoIds) {
          const photo = await getPhotoById(photoId);
          if (!photo) continue;
          const canAccess = await canUserAccessEvent(photo.eventId, { userId: user?.id, accessCode });
          if (!canAccess) continue;
          const filename = photo.originalFilename || photo.filename || `photo-${photo.id}`;
          if (!eventIdForActivity) eventIdForActivity = photo.eventId;
          if (typeof photo.fileSize === 'number' && Number.isFinite(photo.fileSize)) {
            totalBytes += photo.fileSize;
          }

          // Stream source: prefer S3 GetObject directly when key is available; otherwise fallback to local fetch
          try {
            if (photo.filePath?.startsWith('s3:')) {
              const key = photo.filePath.replace(/^s3:/, '');
              // Stream directly from S3 using SDK to avoid presigned URL socket management
              const { GetObjectCommand } = await import('@aws-sdk/client-s3');
              const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
              const obj: any = await s3.send(cmd);
              const body = obj.Body as Readable | undefined;
              if (body) {
                archive.append(body, { name: filename, date: new Date() });
              }
            } else if (photo.filePath) {
              // Build absolute URL to local API and include access code for auth
              const local = new URL(`/api/photos/${photo.id}`, request.url);
              if (accessCode) local.searchParams.set('code', accessCode);
              const res = await fetch(local.toString(), {
                headers: accessCode ? { 'x-access-code': accessCode } : undefined,
              });
              if (res.ok && res.body) {
                const nodeReadable = Readable.fromWeb(res.body as any);
                archive.append(nodeReadable as any, { name: filename, date: new Date() });
              }
            }
          } catch (e) {
            // Skip on error for individual file
            continue;
          }
        }
      } finally {
        try { await archive.finalize(); } catch {}
      }
    })();
    // Best-effort: log a bulk download at the event level and bump version to refresh stats cache
    (async () => {
      try {
        if (eventIdForActivity) {
          await logActivity({
            userId: user?.id ?? null,
            eventId: eventIdForActivity,
            action: ActivityType.DOWNLOAD_PHOTO,
            ipAddress: ip || undefined,
            detail: `Bulk downloaded ${photoIds.length} photos for event ${eventIdForActivity}`,
          });
          await bumpEventVersion(eventIdForActivity);
        }
      } catch {}
    })();

    // Stream the zip to the client using a Web stream wrapper
    let body: any;
    try {
      body = (Readable as any).toWeb(archive as any) as unknown as ReadableStream;
    } catch {
      body = archive as any;
    }
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="photos.zip"',
        'X-Total-Bytes': String(totalBytes || 0),
        'Cache-Control': 'no-store',
        // No Content-Length because we are streaming
      },
    });
  } catch (error) {
    console.error('Bulk download error:', error);
    return NextResponse.json({ error: 'Failed to create ZIP' }, { status: 500 });
  }
}
