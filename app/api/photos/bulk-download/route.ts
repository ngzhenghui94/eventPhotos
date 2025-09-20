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
import JSZip from 'jszip';
import { Readable } from 'stream';
import { getPhotoById, canUserAccessEvent, getUser } from '@/lib/db/queries';
import { getSignedDownloadUrl } from '@/lib/s3';

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
    const zip = new JSZip();
    let totalBytes = 0;
    // Parallel fetch with bounded concurrency; add file streams to zip
    const concurrency = 4;
    let current = 0;
    async function worker() {
      while (true) {
        const i = current++;
        if (i >= photoIds.length) return;
        const photoId = photoIds[i];
        const photo = await getPhotoById(photoId);
        if (!photo) continue;
        // Authorize using user session or provided access code (for guests)
        const canAccess = await canUserAccessEvent(photo.eventId, { userId: user?.id, accessCode });
        if (!canAccess) continue;
        const filename = photo.originalFilename || photo.filename;
        if (typeof photo.fileSize === 'number' && Number.isFinite(photo.fileSize)) {
          totalBytes += photo.fileSize;
        }
        try {
          let url: string | null = null;
          if (photo.filePath?.startsWith('s3:')) {
            const key = photo.filePath.replace(/^s3:/, '');
            url = await getSignedDownloadUrl(key, 60, {
              contentDisposition: `attachment; filename=\"${encodeURIComponent(filename)}\"`
            });
          } else if (photo.filePath) {
            // Build absolute URL to local photo API and include access code for auth
            const local = new URL(`/api/photos/${photo.id}`, request.url);
            if (accessCode) local.searchParams.set('code', accessCode);
            url = local.toString();
          }
          if (!url) continue;
          const res = await fetch(url, {
            // Include header for local API auth; S3 ignores it
            headers: accessCode ? { 'x-access-code': accessCode } : undefined,
          });
          if (!res.ok || !res.body) continue;
          // Convert Web ReadableStream to Node Readable for JSZip
          const nodeReadable = Readable.fromWeb(res.body as any);
          zip.file(filename, nodeReadable as any);
        } catch {}
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, photoIds.length) }, () => worker()));
    // Stream the zip to the client to avoid buffering in memory. Convert Node stream to Web stream for NextResponse
    const nodeStream = zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true, compression: 'STORE' });
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
    return new NextResponse(webStream, {
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
