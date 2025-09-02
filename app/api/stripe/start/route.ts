import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { createCheckoutSession } from '@/lib/payments/stripe';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const priceId = url.searchParams.get('priceId');
  if (!priceId) {
    return NextResponse.redirect(new URL('/pricing', req.url));
  }

  const user = await getUser();
  if (!user) {
    const back = `/api/stripe/start?priceId=${encodeURIComponent(priceId)}`;
    return NextResponse.redirect(new URL(`/api/auth/google?redirect=${encodeURIComponent(back)}`, req.url));
  }

  const team = await getTeamForUser();
  if (!team) {
    return NextResponse.redirect(new URL('/pricing', req.url));
  }

  // Delegate to shared Stripe helper, which will redirect to session URL
  await createCheckoutSession({ team, priceId });
  // createCheckoutSession will redirect; this is a fallback
  return NextResponse.redirect(new URL('/pricing', req.url));
}
