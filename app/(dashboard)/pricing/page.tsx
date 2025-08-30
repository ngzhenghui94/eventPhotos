import { checkoutAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import { SubmitButton } from './submit-button';

// Prices are fresh for one hour max
export const revalidate = 3600;

export default async function PricingPage() {
  // Use static pricing data for build purposes
  const staticPrices = [
    { id: 'price_base', productId: 'prod_base', unitAmount: 800, interval: 'month', trialPeriodDays: 7 },
    { id: 'price_plus', productId: 'prod_plus', unitAmount: 1200, interval: 'month', trialPeriodDays: 7 }
  ];
  
  const staticProducts = [
    { id: 'prod_base', name: 'Base', description: 'Basic event photo sharing plan' },
    { id: 'prod_plus', name: 'Plus', description: 'Advanced event photo sharing plan' }
  ];

  const basePlan = staticProducts.find((product) => product.name === 'Base');
  const plusPlan = staticProducts.find((product) => product.name === 'Plus');

  const basePrice = staticPrices.find((price) => price.productId === basePlan?.id);
  const plusPrice = staticPrices.find((price) => price.productId === plusPlan?.id);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your EventPhotos Plan
        </h1>
        <p className="text-xl text-gray-600">
          Share and collect photos from your events with guests
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-8 max-w-xl mx-auto">
        <PricingCard
          name={basePlan?.name || 'Base'}
          price={basePrice?.unitAmount || 800}
          interval={basePrice?.interval || 'month'}
          trialDays={basePrice?.trialPeriodDays || 7}
          features={[
            'Up to 5 Events per month',
            'Unlimited Photo Uploads',
            'Guest Photo Sharing',
            'Basic Photo Gallery',
            'Email Support',
          ]}
          priceId={basePrice?.id}
        />
        <PricingCard
          name={plusPlan?.name || 'Plus'}
          price={plusPrice?.unitAmount || 1200}
          interval={plusPrice?.interval || 'month'}
          trialDays={plusPrice?.trialPeriodDays || 7}
          features={[
            'Unlimited Events',
            'Unlimited Photo Uploads',
            'Guest Photo Sharing',
            'Advanced Photo Gallery',
            'Photo Download & Export',
            'Custom Event Branding',
            '24/7 Support + Priority',
          ]}
          priceId={plusPrice?.id}
        />
      </div>
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
}: {
  name: string;
  price: number;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
}) {
  return (
    <div className="pt-6">
      <h2 className="text-2xl font-medium text-gray-900 mb-2">{name}</h2>
      <p className="text-sm text-gray-600 mb-4">
        with {trialDays} day free trial
      </p>
      <p className="text-4xl font-medium text-gray-900 mb-6">
        ${price / 100}{' '}
        <span className="text-xl font-normal text-gray-600">
          per user / {interval}
        </span>
      </p>
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      <form action={checkoutAction}>
        <input type="hidden" name="priceId" value={priceId} />
        <SubmitButton />
      </form>
    </div>
  );
}
