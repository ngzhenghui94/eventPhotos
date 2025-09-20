import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { invitations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request, context: { params: Promise<{ invitationId: string }> }) {
  await requireSuperAdmin();
  const { invitationId } = await context.params;
  const id = Number(invitationId);
  const form = await request.formData();
  const status = String(form.get('status') || 'pending');
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  await db.update(invitations).set({ status }).where(eq(invitations.id, id));
  return NextResponse.redirect(new URL('/dashboard/admin/invitations', request.url), { status: 303 });
}
