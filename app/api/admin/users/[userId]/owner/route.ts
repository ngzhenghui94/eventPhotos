import { NextResponse } from 'next/server';
import { requireSuperAdminApi } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  const user = await requireSuperAdminApi();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { userId: userIdParam } = await context.params;
  const userId = Number(userIdParam);
  const form = await request.formData();
  const isOwner = String(form.get('isOwner')) === 'true';
  if (!userId) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  await db.update(users).set({ isOwner, updatedAt: new Date() }).where(eq(users.id, userId));
  return NextResponse.redirect(new URL('/dashboard/admin/users', request.url), { status: 303 });
}
