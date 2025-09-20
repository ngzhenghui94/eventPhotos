import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  await requireSuperAdmin();
  const { userId: userIdParam } = await context.params;
  const userId = Number(userIdParam);
  const form = await request.formData();
  const role = String(form.get('role') || 'member');
  if (!userId || !['owner','member'].includes(role)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
  return NextResponse.redirect(new URL('/dashboard/admin/users', request.url), { status: 303 });
}
