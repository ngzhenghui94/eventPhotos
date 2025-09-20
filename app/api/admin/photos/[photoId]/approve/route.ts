import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { photos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request, context: { params: Promise<{ photoId: string }> }) {
  await requireSuperAdmin();
  const { photoId: photoIdParam } = await context.params;
  const photoId = Number(photoIdParam);
  if (!photoId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  await db.update(photos).set({ isApproved: true }).where(eq(photos.id, photoId));
  return NextResponse.redirect(new URL('/dashboard/admin/photos', request.url), { status: 303 });
}
