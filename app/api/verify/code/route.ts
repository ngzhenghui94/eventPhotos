import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';

export async function POST(request: Request) {
  const user = await getUser();
  // Email verification disabled: always go to dashboard if signed in, otherwise Google SSO.
  return NextResponse.redirect(new URL(user ? '/dashboard' : '/api/auth/google', request.url));
}
