import { cookies } from 'next/headers';
import { getUser } from '@/lib/db/queries';
import { ActivityType } from '@/lib/db/schema';
import { logActivity } from '@/app/(login)/actions';

export async function POST() {
  const user = await getUser();
  if (user) {
    await logActivity(null, user.id, ActivityType.SIGN_OUT);
  }
  (await cookies()).delete('session');
  return Response.json({ success: true });
}
