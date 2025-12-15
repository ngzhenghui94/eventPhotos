import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { createCheckoutSessionUrl } from '@/lib/payments/stripe';

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

  // Start Stripe checkout
  try {
    const checkoutUrl = await createCheckoutSessionUrl({ priceId, origin: req.nextUrl.origin });
    return NextResponse.redirect(checkoutUrl);
  } catch (e) {
    return NextResponse.redirect(new URL('/pricing', req.url));
  }
}
