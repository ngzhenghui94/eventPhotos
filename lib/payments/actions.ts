'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
// import removed: withTeam
// import removed: updateTeamSubscription


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
  // TODO: Replace team logic with user or event context as needed
  redirect('/dashboard');
};
