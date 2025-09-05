import Stripe from 'stripe';
import { redirect } from 'next/navigation';
// import removed: Team
import {
  getUser,
  updateUserSubscription
} from '@/lib/db/queries';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
export const stripe: Stripe | null = STRIPE_SECRET ? new Stripe(STRIPE_SECRET) : null;

export async function createCheckoutSession({ priceId }: { priceId: string }) {
  const user = await getUser();
  if (!user) {
    const back = `/api/stripe/start?priceId=${encodeURIComponent(priceId)}`;
    redirect(`/api/auth/google?redirect=${encodeURIComponent(back)}`);
  }
  if (!stripe) {
    redirect('/pricing');
  }
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    mode: 'subscription',
    success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/pricing`,
    client_reference_id: user.id.toString(),
    allow_promotion_codes: true
  });
  redirect(session.url!);
}

export async function createCustomerPortalSession() {
  if (!stripe) {
    redirect('/pricing');
  }
  // TODO: Implement user-based Stripe customer lookup
  // For now, redirect to dashboard
  redirect('/dashboard');
}

export async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;
  // Find user by Stripe customer ID
  // This requires storing Stripe customer ID on user record at checkout
  const user = await findUserByStripeCustomerId(customerId);
  if (!user) return;
  const planNickname = subscription.items.data[0]?.price.nickname;
  if (status === 'active' || status === 'trialing') {
    await updateUserSubscription({
      userId: user.id,
      planName: planNickname || 'Unknown',
      subscriptionStatus: 'paid'
    });
  } else if (status === 'canceled' || status === 'unpaid') {
    await updateUserSubscription({
      userId: user.id,
      planName: 'Free',
      subscriptionStatus: 'free'
    });
  }
}
// Helper to find user by Stripe customer ID
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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
