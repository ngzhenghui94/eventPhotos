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
    for (const photoId of photoIds) {
      const photo = await getPhotoById(photoId);
      if (!photo) continue;
      const canAccess = await canUserAccessEvent(photo.eventId, { userId: user?.id });
      if (!canAccess) continue;
      let fileBuffer;
      let filename = photo.originalFilename || photo.filename;
      if (photo.filePath?.startsWith('s3:')) {
        const key = photo.filePath.replace(/^s3:/, '');
        const url = await getSignedDownloadUrl(key, 60, {
          contentDisposition: `attachment; filename=\"${encodeURIComponent(filename)}\"`
        });
        const res = await fetch(url);
        if (!res.ok) continue;
        fileBuffer = await res.arrayBuffer();
      } else {
        // Local fallback
        const res = await fetch(photo.filePath);
        if (!res.ok) continue;
        fileBuffer = await res.arrayBuffer();
      }
      zip.file(filename, fileBuffer);
    }
    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
    // Convert Uint8Array to Buffer for NextResponse
    const buffer = Buffer.from(zipBuffer);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="photos.zip"',
      },
    });
  } catch (error) {
    console.error('Bulk download error:', error);
    return NextResponse.json({ error: 'Failed to create ZIP' }, { status: 500 });
  }
}
