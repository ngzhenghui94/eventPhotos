import Stripe from 'stripe';
import { handleSubscriptionChange, stripe } from '@/lib/payments/stripe';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured.' },
        { status: 400 }
      );
    }
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed.' },
      { status: 400 }
    );
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      try {
        const customerId = session.customer as string | null;
        const clientRef = session.client_reference_id || null;
        if (customerId && clientRef) {
          // Persist mapping user.id -> stripeCustomerId, subscriptionId if available
          const subscriptionId = (session.subscription as string) || null;
          await db.update(users)
            .set({
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId || undefined,
              updatedAt: new Date(),
            })
            .where(eq(users.id, Number(clientRef)));
        }
      } catch (e) {
        console.error('Failed to persist checkout session mapping', e);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(subscription);
      try {
        // Also persist start/end timestamps if available
        const customerId = subscription.customer as string;
        const startedAt = (subscription as any).current_period_start
          ? new Date((subscription as any).current_period_start * 1000)
          : undefined;
        const endsAt = (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000)
          : undefined;
        // Update any user with this customer id
        await db
          .update(users)
          .set({
            subscriptionStart: startedAt,
            subscriptionEnd: endsAt,
            updatedAt: new Date(),
          })
          .where(eq(users.stripeCustomerId, customerId));
      } catch (e) {
        console.error('Failed to persist subscription period', e);
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
