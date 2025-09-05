import { checkoutAction, chooseFreePlanAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getStripeProducts, getStripePrices } from '@/lib/payments/stripe';
import { SubmitButton } from './submit-button';
import { brand } from '@/lib/brand';

// Prices are fresh for one hour max
export default async function PricingPage() {

  // Fetch Stripe products/prices dynamically to resolve real price IDs
  // Requires STRIPE_SECRET_KEY to be set, but no per-price envs needed.
  let starterStripeId: string | undefined;
  let hobbyStripeId: string | undefined;
  let proStripeId: string | undefined;
  let businessStripeId: string | undefined;
  let starterUnitAmount = 1000;
  let hobbyUnitAmount = 2900;
  let proUnitAmount = 10000;
  let businessUnitAmount = 25000;
  let starterInterval = 'month';
  let hobbyInterval = 'month';
  let proInterval = 'month';
  let businessInterval = 'month';

  try {
    const [products, prices] = await Promise.all([
      getStripeProducts(),
      getStripePrices()
    ]);

    const byName = (n: string) => products.find(p => p.name.toLowerCase() === n);
    const starterProduct = byName('starter');
    const hobbyProduct = byName('hobby');
    const proProduct = byName('profession');
    const businessProduct = byName('business');

    const priceForProduct = (productId?: string) => prices.find(pr => pr.productId === productId);
    const starterPrice = priceForProduct(starterProduct?.id);
    const hobbyPrice = priceForProduct(hobbyProduct?.id);
    const proPrice = priceForProduct(proProduct?.id);
    const businessPrice = priceForProduct(businessProduct?.id);

    starterStripeId = starterPrice?.id || (starterProduct?.defaultPriceId ?? undefined);
    hobbyStripeId = hobbyPrice?.id || (hobbyProduct?.defaultPriceId ?? undefined);
    proStripeId = proPrice?.id || (proProduct?.defaultPriceId ?? undefined);
    businessStripeId = businessPrice?.id || (businessProduct?.defaultPriceId ?? undefined);

    if (starterPrice?.unitAmount) starterUnitAmount = starterPrice.unitAmount;
    if (hobbyPrice?.unitAmount) hobbyUnitAmount = hobbyPrice.unitAmount;
    if (proPrice?.unitAmount) proUnitAmount = proPrice.unitAmount;
    if (businessPrice?.unitAmount) businessUnitAmount = businessPrice.unitAmount;
    if (starterPrice?.interval) starterInterval = starterPrice.interval;
    if (hobbyPrice?.interval) hobbyInterval = hobbyPrice.interval;
    if (proPrice?.interval) proInterval = proPrice.interval;
    if (businessPrice?.interval) businessInterval = businessPrice.interval;
    // Trials disabled
  } catch (e) {
    // Keep static values; buttons will degrade to sign-up if IDs aren't resolved
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-blue-50 fade-in-up">
      {/* Pricing Hero */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 animate-gradient bg-gradient-to-br from-orange-200 via-amber-100 to-blue-200 opacity-60"></div>
        <div className="text-center mb-12 fade-in-up">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">Choose Your {brand.productName} Plan</h1>
          <p className="text-xl text-gray-700">
            Share and collect photos from your events with guests
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 max-w-7xl mx-auto fade-in-up">
          <PricingCard
            name={'Free'}
            price={0}
            interval={'month'}
            trialDays={0}
            features={[
              '1 Event',
              '20MB per upload',
              '5MB per upload',
              'Guest Photo Sharing',
              'Basic Photo Gallery',
              'Photo Download & Export',
            ]}
            free
          />
          <PricingCard
            name={'Starter'}
            price={starterUnitAmount}
            interval={starterInterval}
            trialDays={0}
            features={[
              '1 Event',
              '50 photos per event',
              '20MB per upload',
              'Guest Photo Sharing',
              'Basic Photo Gallery',
              'Photo Download & Export',
            ]}
            priceId={starterStripeId}
          />
          <PricingCard
            name={'Hobby'}
            price={hobbyUnitAmount}
            interval={hobbyInterval}
            trialDays={0}
            features={[
              '5 Events',
              '100 photos per event',
              '25MB per upload',
              'Guest Photo Sharing',
              'Basic Photo Gallery',
              'Photo Download & Export',
            ]}
            priceId={hobbyStripeId}
          />
          <PricingCard
            name={'Pro'}
            price={proUnitAmount}
            interval={proInterval}
            trialDays={0}
            features={[
              '20 Events',
              '500 photos per event',
              '50MB per upload',
              'Guest Photo Sharing',
              'Advanced Photo Gallery',
              'Photo Download & Export',
              'Teams Enabled',
            ]}
            priceId={proStripeId}
          />
          <PricingCard
            name={'Business'}
            price={businessUnitAmount}
            interval={businessInterval}
            trialDays={0}
            features={[
              'Unlimited Events',
              '1000 photos per event',
              '100MB per upload',
              'Guest Photo Sharing',
              'Advanced Photo Gallery',
              'Photo Download & Export',
              'Teams Enabled',
            ]}
            priceId={businessStripeId}
          />
        </div>
      </section>
  {/* Animations and glassmorphism are now handled by Tailwind classes. Custom CSS removed to avoid client-only error. */}
    </main>
  );
}

function PricingCard({
  name,
  price,
  interval,
  trialDays,
  features,
  priceId,
  free,
}: {
  name: string;
  price: number;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
  free?: boolean;
}) {
  return (
  <div className="glass-card rounded-xl pt-8 pb-6 px-6 flex flex-col items-center text-center shadow-lg fade-in-up">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{name}</h2>
      {trialDays > 0 ? (
        <p className="text-sm text-gray-600 mb-4">with {trialDays} day free trial</p>
      ) : (
        <p className="text-sm text-gray-600 mb-4">no credit card required</p>
      )}
      <p className="text-4xl font-extrabold text-amber-600 mb-6">
        {price === 0 ? '$0' : `$${price / 100}`} {' '}
        <span className="text-xl font-normal text-gray-600">
          / {interval}
        </span>
      </p>
      <ul className="space-y-4 mb-8 w-full">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center justify-center">
            <Check className="h-5 w-5 text-orange-500 mr-2 flex-shrink-0" />
            <span className="text-gray-700 text-base">{feature}</span>
          </li>
        ))}
      </ul>
      {free ? (
        <form action={chooseFreePlanAction} className="w-full">
          <SubmitButton />
        </form>
      ) : priceId ? (
        <form action={checkoutAction} className="w-full">
          <input type="hidden" name="priceId" value={priceId} />
          <SubmitButton />
        </form>
      ) : (
        <div className="space-y-2 w-full">
          <a href="/api/auth/google" className="inline-block w-full">
            <SubmitButton />
          </a>
          <p className="text-xs text-gray-500">Stripe price not configured. Set STRIPE_PRICE_BASE_ID / STRIPE_PRICE_PLUS_ID in your environment.</p>
        </div>
      )}
    </div>
  );
}
