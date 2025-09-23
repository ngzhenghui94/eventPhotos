import { getUser } from '@/lib/db/queries';
import { UserMenuClient } from './user-menu.client';
import type { User } from '@/lib/db/schema';

export async function UserMenu({ mobile = false }: { mobile?: boolean }) {
  // Server-side fetch to avoid client flicker on reload
  const user = (await getUser()) as User | null;
  return <UserMenuClient mobile={mobile} initialUser={user} />;
}
