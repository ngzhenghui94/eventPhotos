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
import { Readable } from 'node:stream';
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

    const { photoIds } = await request.json();
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: 'No photo IDs provided' }, { status: 400 });
    }
    const user = await getUser();
    const zip = new JSZip();
    let totalBytes = 0;
    for (const photoId of photoIds) {
      const photo = await getPhotoById(photoId);
      if (!photo) continue;
      const canAccess = await canUserAccessEvent(photo.eventId, { userId: user?.id });
      if (!canAccess) continue;
      let filename = photo.originalFilename || photo.filename;
      // accumulate expected bytes for progress hints
      if (typeof photo.fileSize === 'number' && Number.isFinite(photo.fileSize)) {
        totalBytes += photo.fileSize;
      }
      if (photo.filePath?.startsWith('s3:')) {
        const key = photo.filePath.replace(/^s3:/, '');
        const url = await getSignedDownloadUrl(key, 60, {
          contentDisposition: `attachment; filename=\"${encodeURIComponent(filename)}\"`
        });
        const res = await fetch(url);
        if (!res.ok || !res.body) continue;
        const nodeReadable = Readable.fromWeb(res.body as any);
        zip.file(filename, nodeReadable, { binary: true, createFolders: false });
      } else {
        // Local fallback
        const res = await fetch(photo.filePath);
        if (!res.ok || !res.body) continue;
        const nodeReadable = Readable.fromWeb(res.body as any);
        zip.file(filename, nodeReadable, { binary: true, createFolders: false });
      }
    }
    const nodeZipStream = zip.generateNodeStream({ streamFiles: true, compression: 'STORE' });
    const webStream = Readable.toWeb(nodeZipStream as any) as ReadableStream;
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="photos.zip"',
        'X-Total-Bytes': String(totalBytes || 0),
        // no Content-Length since we stream
      },
    });
  } catch (error) {
    console.error('Bulk download error:', error);
    return NextResponse.json({ error: 'Failed to create ZIP' }, { status: 500 });
  }
}
