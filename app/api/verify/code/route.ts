import { NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';

export async function POST(request: Request) {
  const user = await getUser();
  // Email verification disabled: always go to dashboard if signed in, otherwise sign-in.
  return NextResponse.redirect(new URL(user ? '/dashboard' : '/sign-in', request.url));
}
