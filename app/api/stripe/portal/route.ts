import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { stripe } from '@/lib/payments/stripe';

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL('/pricing', req.url));
  if (!stripe) return NextResponse.redirect(new URL('/pricing', req.url));
  if (!user.stripeCustomerId) return NextResponse.redirect(new URL('/pricing', req.url));

  const origin = req.nextUrl.origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/dashboard/general`,
  });
  return NextResponse.redirect(session.url);
}


