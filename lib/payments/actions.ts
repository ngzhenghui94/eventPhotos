'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { getUser, updateUserSubscription } from '@/lib/db/queries';


export const checkoutAction = async (formData: FormData) => {
  const priceId = formData.get('priceId') as string;
  // TODO: Replace team logic with user or event context as needed
  await createCheckoutSession({ priceId });
};

export const customerPortalAction = async () => {
  // TODO: Replace team logic with user or event context as needed
  await createCustomerPortalSession();
};

export const chooseFreePlanAction = async () => {
  const user = await getUser();
  if (!user) {
    redirect('/api/auth/google?redirect=%2Fdashboard%2Fgeneral');
  }

  // If the user already has an active Stripe customer, use the portal to cancel/downgrade properly.
  if (user.stripeCustomerId) {
    redirect('/api/stripe/portal');
  }

  await updateUserSubscription({
    userId: user.id,
    planName: 'free',
    subscriptionStatus: 'free',
  });

  redirect('/dashboard/general');
};
