import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { normalizePlanName } from '@/lib/plans';

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const actor = await getUser();
  // Admin-only endpoint: allow true admins/owners to manage plans
  const isAdmin = actor?.role === 'admin' || actor?.role === 'owner' || actor?.isOwner === true;
  if (!actor || !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const awaitedParams = await params;
  const userId = Number(awaitedParams.userId);
  if (!userId || !Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }
  const data = await req.formData();
  const rawPlanName = (data.get('planName') as string | null) ?? '';
  const planName = normalizePlanName(rawPlanName);

  // Update user's plan
  await db.update(users)
    .set({ planName, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return NextResponse.json({ success: true, planName });
}
