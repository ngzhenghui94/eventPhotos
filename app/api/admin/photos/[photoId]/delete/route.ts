import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { photos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deleteFromS3 } from '@/lib/s3';
import { join } from 'path';
import { promises as fs } from 'fs';
import { redis } from '@/lib/upstash';
import { getEventById } from '@/lib/db/queries';
import { bumpEventVersion } from '@/lib/utils/cache';
import { getEventStatsCached, setEventStatsCached } from '@/lib/utils/cache';

export async function POST(request: Request, context: { params: Promise<{ photoId: string }> }) {
  await requireSuperAdmin();
  const { photoId: photoIdParam } = await context.params;
  const photoId = Number(photoIdParam);
  if (!photoId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const p = await db.query.photos.findFirst({ where: eq(photos.id, photoId) });
  if (p?.filePath) {
    try {
      if (p.filePath.startsWith('s3:')) {
        await deleteFromS3(p.filePath.replace(/^s3:/, ''));
      } else {
        const filePath = join(process.cwd(), 'public', p.filePath);
        await fs.unlink(filePath).catch(() => {});
      }
    } catch {}
  }

  await db.delete(photos).where(eq(photos.id, photoId));
  // Adjust counters and invalidate caches
  if (p) {
    try {
      await Promise.all([
        bumpEventVersion(p.eventId),
        redis.del(`photo:meta:${photoId}`),
        redis.del(`photo:url:${photoId}`),
        redis.del(`photo:thumb:url:${photoId}`),
      ]);
      const event = await getEventById(p.eventId);
      if (event) {
        await redis.del(`user:${event.createdBy}:events:list:v2`);
      }
      // Warm/update stats: total -1 and approved -1 if was approved
      try {
        const prev = await getEventStatsCached(p.eventId);
        if (prev) {
          const next = {
            ...prev,
            totalPhotos: Math.max(0, prev.totalPhotos - 1),
            approvedPhotos: p.isApproved ? Math.max(0, prev.approvedPhotos - 1) : prev.approvedPhotos,
            pendingApprovals: Math.max(0, (Math.max(0, prev.totalPhotos - 1)) - (p.isApproved ? Math.max(0, prev.approvedPhotos - 1) : prev.approvedPhotos)),
          };
          await setEventStatsCached(p.eventId, next);
        }
      } catch {}
    } catch {}
  }
  return NextResponse.redirect(new URL('/dashboard/admin/photos', request.url), { status: 303 });
}
