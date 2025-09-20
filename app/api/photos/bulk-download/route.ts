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
import { cookies } from 'next/headers';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import JSZip from 'jszip';
import { Readable } from 'stream';
import { getPhotoById, canUserAccessEvent, getUser, getEventById } from '@/lib/db/queries';
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
  let addedCount = 0;
  const headerAccessCode = request.headers.get('x-access-code')?.toUpperCase().trim();
  const cookieJar = cookies();
  const eventMetaCache = new Map<number, { code: string; isPublic: boolean }>();
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
        // Resolve access code per event: body -> header -> cookie (if private)
        let providedCode: string | undefined = accessCode || headerAccessCode || undefined;
        if (!providedCode) {
          let meta = eventMetaCache.get(photo.eventId);
          if (!meta) {
            const ev = await getEventById(photo.eventId);
            if (ev) {
              meta = { code: ev.eventCode, isPublic: !!ev.isPublic };
              eventMetaCache.set(photo.eventId, meta);
            }
          }
          if (meta && !meta.isPublic) {
            try {
              const cookieKey = `evt:${meta.code}:access`;
              const fromCookie = (await cookieJar).get(cookieKey)?.value?.toUpperCase().trim();
              if (fromCookie) providedCode = fromCookie;
            } catch {}
          }
        }
        const canAccess = await canUserAccessEvent(photo.eventId, { userId: user?.id, accessCode: providedCode });
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
            url = photo.filePath;
          }
          if (!url) continue;
          const res = await fetch(url);
          if (!res.ok || !res.body) continue;
          // Convert Web ReadableStream to Node Readable for JSZip
          const nodeReadable = Readable.fromWeb(res.body as any);
          zip.file(filename, nodeReadable as any);
          addedCount += 1;
        } catch {}
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, photoIds.length) }, () => worker()));
    if (addedCount === 0) {
      return NextResponse.json({ error: 'No authorized files to download' }, { status: 403 });
    }
    // Stream the zip to the client to avoid buffering in memory
    const nodeStream = zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true, compression: 'STORE' });
    return new NextResponse(nodeStream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="photos.zip"',
        'X-Total-Bytes': String(totalBytes || 0),
        // No Content-Length because we are streaming
      },
    });
  } catch (error) {
    console.error('Bulk download error:', error);
    return NextResponse.json({ error: 'Failed to create ZIP' }, { status: 500 });
  }
}
