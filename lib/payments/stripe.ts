import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import {
  getUser,
  updateUserSubscription
} from '@/lib/db/queries';
import { normalizePlanName } from '@/lib/plans';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
export const stripe: Stripe | null = STRIPE_SECRET ? new Stripe(STRIPE_SECRET) : null;

async function getBaseUrl(): Promise<string | null> {
  const env = (process.env.BASE_URL || '').trim().replace(/\/$/, '');
  if (env) return env;
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'https';
    if (host) return `${proto}://${host}`;
  } catch {}
  return null;
}

export async function createCheckoutSessionUrl({ priceId, origin }: { priceId: string; origin?: string }) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');
  if (!stripe) throw new Error('Stripe not configured');

  const baseUrl = (origin || '').trim().replace(/\/$/, '') || (await getBaseUrl());
  if (!baseUrl) throw new Error('Missing base URL');

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${baseUrl}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing`,
    client_reference_id: user.id.toString(),
    ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
    subscription_data: {
      metadata: { userId: user.id.toString() }
    },
    allow_promotion_codes: true
  });

  return session.url!;
}

export async function createCheckoutSession({ priceId }: { priceId: string }) {
  const user = await getUser();
  if (!user) {
    const back = `/api/stripe/start?priceId=${encodeURIComponent(priceId)}`;
    redirect(`/api/auth/google?redirect=${encodeURIComponent(back)}`);
  }
  if (!stripe) redirect('/pricing');

  const url = await createCheckoutSessionUrl({ priceId });
  redirect(url);
}

export async function createCustomerPortalSession() {
  if (!stripe) {
    redirect('/pricing');
  }
  const user = await getUser();
  if (!user) redirect('/pricing');
  if (!user.stripeCustomerId) {
    // No Stripe customer yet; user is likely on free plan
    redirect('/pricing');
  }
  const baseUrl = await getBaseUrl();
  if (!baseUrl) redirect('/dashboard/general');

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${baseUrl}/dashboard/general`,
  });
  redirect(session.url);
}

export async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;
  // Find user by Stripe customer ID
  // This requires storing Stripe customer ID on user record at checkout
  const user = await findUserByStripeCustomerId(customerId);
  if (!user) return;
  const planNickname = subscription.items.data[0]?.price.nickname;
  const planName = normalizePlanName(planNickname || '');
  const startedAt = (subscription as any).current_period_start
    ? new Date((subscription as any).current_period_start * 1000)
    : null;
  const endsAt = (subscription as any).current_period_end
    ? new Date((subscription as any).current_period_end * 1000)
    : null;
  if (status === 'active' || status === 'trialing') {
    await updateUserSubscription({
      userId: user.id,
      planName,
      subscriptionStatus: 'paid',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      subscriptionStart: startedAt,
      subscriptionEnd: endsAt,
    });
  } else if (status === 'canceled' || status === 'unpaid') {
    await updateUserSubscription({
      userId: user.id,
      planName: 'free',
      subscriptionStatus: 'free',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      subscriptionStart: startedAt,
      subscriptionEnd: endsAt,
    });
  }
}
// Helper to find user by Stripe customer ID
async function findUserByStripeCustomerId(stripeCustomerId: string) {
  const result = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId)).limit(1);
  return result[0] || null;
}

export async function getStripePrices() {
  if (!stripe) return [] as Array<{ id: string; productId: string; unitAmount: number | null; currency: string | null; interval: string | null; trialPeriodDays: number | null; }>;
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring'
  });

  return prices.data.map((price) => ({
    id: price.id,
    productId:
      typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days
  }));
}

export async function getStripeProducts() {
  if (!stripe) return [] as Array<{ id: string; name: string; description: string | null; defaultPriceId?: string | null; }>;
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price?.id
  }));
}
