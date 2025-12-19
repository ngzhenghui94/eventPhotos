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

/**
 * API-safe version of requireSuperAdmin.
 * Returns user if authorized, null if not (caller must return 403 response).
 * Use this in API routes instead of requireSuperAdmin() which uses redirect().
 */
export async function requireSuperAdminApi(): Promise<User | null> {
  const user = await getUser();
  if (!isSuperAdminUser(user)) {
    return null;
  }
  return user;
}
