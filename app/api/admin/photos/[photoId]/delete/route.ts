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
        redis.del(`evt:${p.eventId}:photos`),
        redis.incrby(`evt:${p.eventId}:photoCount`, -1),
      ]);
      const event = await getEventById(p.eventId);
      if (event) {
        await redis.del(`user:${event.createdBy}:events:list`);
      }
    } catch {}
  }
  return NextResponse.redirect(new URL('/dashboard/admin/photos', request.url));
}
