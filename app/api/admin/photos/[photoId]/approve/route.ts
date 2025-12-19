import { NextResponse } from 'next/server';
import { requireSuperAdminApi } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { photos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redis } from '@/lib/upstash';
import { getEventById } from '@/lib/db/queries';
import { bumpEventVersion } from '@/lib/utils/cache';
import { getEventStatsCached, setEventStatsCached } from '@/lib/utils/cache';

export async function POST(request: Request, context: { params: Promise<{ photoId: string }> }) {
  const user = await requireSuperAdminApi();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { photoId: photoIdParam } = await context.params;
  const photoId = Number(photoIdParam);
  if (!photoId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  await db.update(photos).set({ isApproved: true }).where(eq(photos.id, photoId));
  // Invalidate via version bump and per-photo caches
  try {
    const p = await db.query.photos.findFirst({ where: eq(photos.id, photoId) });
    if (p) {
      await Promise.all([
        bumpEventVersion(p.eventId),
        redis.del(`photo:meta:${photoId}`),
        redis.del(`photo:url:${photoId}`),
        redis.del(`photo:thumb:url:${photoId}`),
      ]);
      const event = await getEventById(p.eventId);
      if (event?.createdBy) {
        await redis.del(`user:${event.createdBy}:events:list:v2`);
      }
      // Warm/update stats: approved +1 if previously unapproved
      try {
        const prev = await getEventStatsCached(p.eventId);
        if (prev) {
          const next = {
            ...prev,
            approvedPhotos: prev.approvedPhotos + 1,
            pendingApprovals: Math.max(0, prev.pendingApprovals - 1),
          };
          await setEventStatsCached(p.eventId, next);
        }
      } catch { }
    }
  } catch { }
  return NextResponse.redirect(new URL('/dashboard/admin/photos', request.url), { status: 303 });
}
