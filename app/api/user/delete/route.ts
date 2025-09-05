import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { logActivity } from '@/app/(login)/actions';
import { ActivityType } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  await logActivity(null, user.id, ActivityType.DELETE_ACCOUNT);
  await db.update(users).set({
    deletedAt: new Date(),
    email: `${user.email}-${user.id}-deleted`
  }).where(eq(users.id, user.id));
  return Response.json({ success: 'Account deleted.' });
}
