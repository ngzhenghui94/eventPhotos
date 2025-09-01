import { NextRequest } from 'next/server';
import { buildGoogleAuthUrl, makeStateToken, setOAuthCookies } from '@/lib/auth/google';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const redirect = searchParams.get('redirect');
  const origin = req.headers.get('x-forwarded-origin') || req.headers.get('origin') || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const state = makeStateToken();
  await setOAuthCookies(state, redirect);
  const url = buildGoogleAuthUrl({ state, origin });
  return Response.redirect(url, 302);
}
