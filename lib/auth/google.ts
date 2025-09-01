import { cookies } from 'next/headers';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

export function getGoogleClientId() {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error('Missing GOOGLE_CLIENT_ID');
  return id;
}

export function getGoogleClientSecret() {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error('Missing GOOGLE_CLIENT_SECRET');
  return secret;
}

export function buildRedirectUri(origin: string) {
  return `${origin}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(params: {
  state: string;
  origin: string;
}): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', getGoogleClientId());
  url.searchParams.set('redirect_uri', buildRedirectUri(params.origin));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', params.state);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  return url.toString();
}

export async function exchangeCodeForTokens(params: {
  code: string;
  origin: string;
}): Promise<{ access_token: string }>
{
  const data = new URLSearchParams({
    code: params.code,
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    redirect_uri: buildRedirectUri(params.origin),
    grant_type: 'authorization_code',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: data.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to exchange code: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json as { access_token: string };
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch userinfo: ${res.status} ${text}`);
  }
  return (await res.json()) as GoogleUserInfo;
}

export function makeStateToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export async function setOAuthCookies(state: string, redirect?: string | null) {
  const jar = await cookies();
  jar.set('oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 600 });
  if (redirect) {
    jar.set('oauth_redirect', redirect, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 600 });
  }
}

export async function readAndClearOAuthCookies() {
  const jar = await cookies();
  const state = jar.get('oauth_state')?.value;
  const redirect = jar.get('oauth_redirect')?.value;
  if (state) jar.delete('oauth_state');
  if (redirect) jar.delete('oauth_redirect');
  return { state, redirect };
}
