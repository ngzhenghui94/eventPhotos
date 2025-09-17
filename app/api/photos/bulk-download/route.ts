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
    const fetchWithRetry = async (url: string, tries = 2) => {
      let lastErr: any;
      for (let i = 0; i < tries; i++) {
        try {
          const res = await fetch(url);
          if (res.ok) return await res.arrayBuffer();
          lastErr = new Error(`HTTP ${res.status}`);
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr;
    };
    // Parallel fetch with bounded concurrency
    const concurrency = 6;
    let current = 0;
    async function worker() {
      while (true) {
        const i = current++;
        if (i >= photoIds.length) return;
        const photoId = photoIds[i];
        const photo = await getPhotoById(photoId);
        if (!photo) continue;
        const canAccess = await canUserAccessEvent(photo.eventId, { userId: user?.id });
        if (!canAccess) continue;
        const filename = photo.originalFilename || photo.filename;
        if (typeof photo.fileSize === 'number' && Number.isFinite(photo.fileSize)) {
          totalBytes += photo.fileSize;
        }
        try {
          let buffer: ArrayBuffer;
          if (photo.filePath?.startsWith('s3:')) {
            const key = photo.filePath.replace(/^s3:/, '');
            const url = await getSignedDownloadUrl(key, 60, {
              contentDisposition: `attachment; filename=\"${encodeURIComponent(filename)}\"`
            });
            buffer = await fetchWithRetry(url, 2);
          } else if (photo.filePath) {
            buffer = await fetchWithRetry(photo.filePath, 2);
          } else {
            return;
          }
          zip.file(filename, Buffer.from(buffer));
        } catch {}
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, photoIds.length) }, () => worker()));
    const zipBuffer = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="photos.zip"',
        'Content-Length': String((zipBuffer as Uint8Array).byteLength),
        'X-Total-Bytes': String(totalBytes || 0),
      },
    });
  } catch (error) {
    console.error('Bulk download error:', error);
    return NextResponse.json({ error: 'Failed to create ZIP' }, { status: 500 });
  }
}
