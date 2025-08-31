import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

export default async function VerifyEntryPage() {
  const user = await getUser();
  // Email verification disabled: send signed-in users to dashboard, others to sign-in.
  if (user) redirect('/dashboard');
  redirect('/sign-in');
}
