import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { setSession } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/pricing', request.url));
  }

  try {
    if (!stripe) {
      return NextResponse.redirect(new URL('/pricing', request.url));
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });

    if (!session.customer || typeof session.customer === 'string') {
      throw new Error('Invalid customer data from Stripe.');
    }

    const customerId = session.customer.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
      throw new Error('No subscription found for this session.');
    }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product'],
    });

    const plan = subscription.items.data[0]?.price;

    if (!plan) {
      throw new Error('No plan found for this subscription.');
    }

    const productId = (plan.product as Stripe.Product).id;

    if (!productId) {
      throw new Error('No product ID found for this subscription.');
    }

    const userId = session.client_reference_id;
    if (!userId) {
      throw new Error("No user ID found in session's client_reference_id.");
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(userId)))
      .limit(1);

    if (user.length === 0) {
      throw new Error('User not found in database.');
    }

    // Determine plan name from Stripe price or product
    let planName = plan.nickname;
    // Try to get product name if nickname is missing and product is not deleted
    if (!planName && plan.product && typeof plan.product !== 'string' && 'name' in plan.product) {
      planName = (plan.product as Stripe.Product).name;
    }
    // Fallback: map priceId to plan name if needed
    const priceIdToPlan: Record<string, string> = {
      // TODO: Fill in with your actual Stripe price IDs from Stripe dashboard
      'price_starter_id': 'Starter',
      'price_hobby_id': 'Hobby',
      'price_pro_id': 'Pro',
      'price_business_id': 'Business',
    };
    if (!planName && plan.id && priceIdToPlan[plan.id]) {
      planName = priceIdToPlan[plan.id];
    }
    if (!planName) {
      planName = 'Unknown';
    }
    const sub = subscription as Stripe.Subscription;
    let subscriptionEnd = null;
    if (sub.status === 'active' || sub.status === 'trialing') {
      subscriptionEnd = (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000) : null;
    } else if (sub.ended_at) {
      subscriptionEnd = new Date(sub.ended_at * 1000);
    }
    await db.update(users)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: 'paid',
        subscriptionStart: new Date(subscription.start_date * 1000),
        subscriptionEnd,
        planName,
        updatedAt: new Date()
      })
      .where(eq(users.id, Number(userId)));

  // Redirect to dashboard/general after successful checkout
  return NextResponse.redirect(new URL('/dashboard/general', request.url));
  } catch (error) {
    console.error('Error handling successful checkout:', error);
    return NextResponse.redirect(new URL('/error', request.url));
  }
}
