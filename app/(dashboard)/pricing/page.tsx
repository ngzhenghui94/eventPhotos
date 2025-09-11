import { checkoutAction, chooseFreePlanAction } from '@/lib/payments/actions';
import { eventLimit, photoLimitPerEvent, uploadLimitBytes, PlanName } from '@/lib/plans';
import { Check, Crown } from 'lucide-react';
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
    <main className="min-h-screen relative overflow-hidden bg-[radial-gradient(1200px_600px_at_-10%_-10%,rgba(255,200,150,0.25),transparent),radial-gradient(900px_500px_at_110%_10%,rgba(125,200,255,0.25),transparent)]">
      {/* subtle grain */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%224%22 height=%224%22 viewBox=%220 0 4 4%22><path fill=%22%23000%22 d=%22M0 0h1v1H0zM2 2h1v1H2z%22/></svg>')]"></div>

      {/* Pricing Hero */}
      <section className="py-16 sm:py-24 relative">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">Choose Your {brand.productName} Plan</h1>
          <p className="mt-3 text-lg text-gray-700">Share and collect photos from your events with guests</p>
        </div>

        <div className="mx-auto grid max-w-7xl gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 px-4">
          {[
            {
              name: 'Free',
              plan: 'free' as PlanName,
              price: 0,
              interval: 'month',
              trialDays: 0,
              priceId: undefined,
              free: true,
              featured: false,
            },
            {
              name: 'Starter',
              plan: 'starter' as PlanName,
              price: starterUnitAmount,
              interval: starterInterval,
              trialDays: 0,
              priceId: starterStripeId,
              featured: false,
            },
            {
              name: 'Hobby',
              plan: 'hobby' as PlanName,
              price: hobbyUnitAmount,
              interval: hobbyInterval,
              trialDays: 0,
              priceId: hobbyStripeId,
              featured: false,
            },
            {
              name: 'Pro',
              plan: 'pro' as PlanName,
              price: proUnitAmount,
              interval: proInterval,
              trialDays: 0,
              priceId: proStripeId,
              featured: true, // highlight
            },
            {
              name: 'Business',
              plan: 'business' as PlanName,
              price: businessUnitAmount,
              interval: businessInterval,
              trialDays: 0,
              priceId: businessStripeId,
              featured: false,
            },
          ].map(({ name, plan, price, interval, trialDays, priceId, free, featured }) => (
            <PricingCard
              key={name}
              name={name}
              price={price}
              interval={interval}
              trialDays={trialDays}
              features={[
                `${eventLimit(plan) === null ? 'Unlimited' : eventLimit(plan)} Event${eventLimit(plan) === 1 ? '' : 's'}`,
                `${photoLimitPerEvent(plan) === null ? 'Unlimited' : photoLimitPerEvent(plan)} photos per event`,
                `${(uploadLimitBytes(plan) / (1024 * 1024)).toFixed(0)}MB per upload`,
                'Guest Photo Sharing',
                (plan === 'pro' || plan === 'business' ? 'Advanced Photo Gallery' : 'Basic Photo Gallery'),
                'Photo Download & Export',
                ...(plan === 'business' ? ['Teams Enabled'] : []),
              ]}
              priceId={priceId}
              free={free}
              featured={featured}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white/70 px-3 py-1 text-xs font-semibold text-gray-900 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <Crown className="h-3.5 w-3.5 text-amber-600" />
      {children}
    </span>
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
  featured,
}: {
  name: string;
  price: number;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
  free?: boolean;
  featured?: boolean;
}) {
  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl",
        "bg-white/10 backdrop-blur-xl supports-[backdrop-filter]:bg-white/10",
        "border border-white/30 shadow-[0_10px_30px_rgba(0,0,0,0.08)]",
        "pt-12 pb-6 px-6 flex flex-col items-center text-center",
        "transition-transform duration-300 hover:-translate-y-1",
        featured ? "ring-2 ring-amber-400" : ""
      ].join(" ")}
    >
      {/* decorative light */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-to-br from-amber-300/40 to-pink-300/30 blur-3xl"></div>

      {featured && (
        <div className="absolute left-1/2 top-1 -translate-x-1/2 z-10">
          <Badge>Most Popular</Badge>
        </div>
      )}

      <h2 className="mt-2 text-2xl font-bold text-gray-900">{name}</h2>
      {trialDays > 0 ? (
        <p className="text-sm text-gray-600 mt-1">with {trialDays} day free trial</p>
      ) : (
        <p className="text-sm text-gray-600 mt-1">no credit card required</p>
      )}

      <p className="mt-6 text-4xl font-extrabold tracking-tight">
        <span className="bg-gradient-to-br from-amber-600 to-orange-500 bg-clip-text text-transparent">
          {price === 0 ? '$0' : `$${(price / 100).toLocaleString()}`}
        </span>
        <span className="text-xl font-normal text-gray-600"> / {interval}</span>
      </p>

      <ul className="mt-8 space-y-4 w-full">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center justify-center text-left">
            <Check className="h-5 w-5 text-orange-500 mr-2 flex-shrink-0" />
            <span className="text-gray-800 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 w-full">
        {free ? (
          <form action={chooseFreePlanAction} className="w-full">
            <SubmitButton disabled={true} />
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
            <p className="text-xs text-gray-500">
              Stripe price not configured. Set STRIPE_PRICE_BASE_ID / STRIPE_PRICE_PLUS_ID in your environment.
            </p>
          </div>
        )}
      </div>

      {/* subtle card hover ring */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-amber-300/0 transition group-hover:ring-8 group-hover:ring-amber-300/10"></div>
    </div>
  );
}
