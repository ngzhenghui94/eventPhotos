import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users, teams, teamMembers, ActivityType } from '@/lib/db/schema';
import { exchangeCodeForTokens, fetchGoogleUserInfo, readAndClearOAuthCookies } from '@/lib/auth/google';
import { setSession } from '@/lib/auth/session';
import { logActivity } from '@/lib/db/queries';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const { state: storedState, redirect } = await readAndClearOAuthCookies();

  if (!code) return Response.json({ error: 'Missing code' }, { status: 400 });
  if (!returnedState || !storedState || returnedState !== storedState) {
    return Response.json({ error: 'Invalid state' }, { status: 400 });
  }

  try {
  const origin = req.headers.get('x-forwarded-origin') || req.headers.get('origin') || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const { access_token } = await exchangeCodeForTokens({ code, origin });
    const profile = await fetchGoogleUserInfo(access_token);
    const email = profile.email?.toLowerCase();
    if (!email) return Response.json({ error: 'Google did not provide an email' }, { status: 400 });

    // Find or create local user
    let [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!existing) {
      const [created] = await db.insert(users).values({
        name: profile.name || profile.given_name || email.split('@')[0],
        email,
        passwordHash: 'google-oauth',
      }).returning();
      existing = created;

      // Create a personal team and membership as owner
      const [team] = await db.insert(teams).values({ name: `${email}'s Team` }).returning();
      await db.insert(teamMembers).values({ userId: existing.id, teamId: team.id, role: 'owner' });
      await logActivity(team.id, existing.id, ActivityType.SIGN_UP);
    }

    // Ensure user has at least one team membership
    const memberships = await db.select().from(teamMembers).where(eq(teamMembers.userId, existing.id)).limit(1);
    const teamId = memberships?.[0]?.teamId;

    await setSession(existing);
    if (teamId) {
      await logActivity(teamId, existing.id, ActivityType.SIGN_IN);
    }

    // Resolve and sanitize redirect: only allow same-origin destinations
    const finalUrl = (() => {
      try {
        const dest = new URL(redirect || '/dashboard', req.url);
        const reqUrl = new URL(req.url);
        if (dest.origin !== reqUrl.origin) return new URL('/dashboard', req.url);
        // Keep path/search/hash only
        return new URL(dest.pathname + dest.search + dest.hash, req.url);
      } catch {
        return new URL('/dashboard', req.url);
      }
    })();
    return NextResponse.redirect(finalUrl);
  } catch (e) {
    console.error('Google OAuth error:', e);
    return NextResponse.redirect(new URL('/?error=google_oauth_failed', req.url));
  }
}
