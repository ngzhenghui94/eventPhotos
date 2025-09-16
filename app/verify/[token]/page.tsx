import { redirect } from 'next/navigation';
import { verifyEmailByToken } from '@/lib/auth/verify';

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ok = await verifyEmailByToken(token);
  redirect(ok ? '/dashboard?verified=1' : '/sign-in?verify=failed');
}
