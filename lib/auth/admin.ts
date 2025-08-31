import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import type { User } from '@/lib/db/schema';

export function isSuperAdminUser(user: User | null | undefined) {
  if (!user) return false;
  return user.email === 'ngzhenghui94@gmail.com' || user.isOwner === true;
}

export async function requireSuperAdmin(): Promise<User> {
  const user = await getUser();
  if (!isSuperAdminUser(user)) {
    redirect('/dashboard');
  }
  return user!;
}
