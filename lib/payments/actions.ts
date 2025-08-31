'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { withTeam } from '@/lib/auth/middleware';
import { updateTeamSubscription } from '@/lib/db/queries';

export const checkoutAction = withTeam(async (formData, team) => {
  const priceId = formData.get('priceId') as string;
  await createCheckoutSession({ team: team, priceId });
});

export const customerPortalAction = withTeam(async (_, team) => {
  const portalSession = await createCustomerPortalSession(team);
  redirect(portalSession.url);
});

export const chooseFreePlanAction = withTeam(async (_, team) => {
  await updateTeamSubscription(team.id, {
    stripeSubscriptionId: null,
    stripeProductId: null,
    planName: 'Free',
    subscriptionStatus: 'free',
  });
  redirect('/dashboard');
});
