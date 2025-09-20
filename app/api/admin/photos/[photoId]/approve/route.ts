import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { photos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '@/lib/upstash';
import { getEventById } from '@/lib/db/queries';

export async function POST(request: Request, context: { params: Promise<{ photoId: string }> }) {
  await requireSuperAdmin();
  const { photoId: photoIdParam } = await context.params;
  const photoId = Number(photoIdParam);
  if (!photoId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  await db.update(photos).set({ isApproved: true }).where(eq(photos.id, photoId));
  // Invalidate event photo list and counts, and per-photo caches
  try {
    const p = await db.query.photos.findFirst({ where: eq(photos.id, photoId) });
    if (p) {
      await Promise.all([
        redis.del(`evt:${p.eventId}:photos`),
        redis.del(`evt:${p.eventId}:photoCount`),
        redis.del(`photo:meta:${photoId}`),
        redis.del(`photo:url:${photoId}`),
        redis.del(`photo:thumb:url:${photoId}`),
      ]);
      const event = await getEventById(p.eventId);
      if (event?.createdBy) {
        await redis.del(`user:${event.createdBy}:events:list:v2`);
      }
    }
  } catch {}
  return NextResponse.redirect(new URL('/dashboard/admin/photos', request.url), { status: 303 });
}
