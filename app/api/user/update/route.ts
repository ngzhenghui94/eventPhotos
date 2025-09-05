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
  const data = await req.json();
  const { name, email } = data;
  if (!name || !email) {
    return Response.json({ error: 'Name and email are required.' }, { status: 400 });
  }
  import { eq } from 'drizzle-orm';
  await Promise.all([
    db.update(users).set({ name, email }).where(eq(users.id, user.id)),
    logActivity(null, user.id, ActivityType.UPDATE_ACCOUNT)
  ]);
  return Response.json({ name, success: 'Account updated successfully.' });
}
