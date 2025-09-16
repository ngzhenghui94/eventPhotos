import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { verifyEmailByCode } from '@/lib/auth/verify';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL('/sign-in', request.url));
  const body = await request.json().catch(() => ({}));
  const code = typeof body?.code === 'string' ? body.code : '';
  const ok = code ? await verifyEmailByCode(user.id, code) : false;
  return NextResponse.redirect(new URL(ok ? '/dashboard?verified=1' : '/dashboard?verify=failed', request.url));
}
