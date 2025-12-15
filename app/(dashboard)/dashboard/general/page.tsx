'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import useSWR from 'swr';
import { Suspense } from 'react';
import { concurrentUploadLimit, eventLimit, normalizePlanName, photoLimitPerEvent, uploadLimitBytes, type PlanName } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Shape returned by GET /api/user (see getUser in lib/db/queries.ts)
type CurrentUser = {
  id: number;
  name: string | null;
  email: string;
  passwordHash?: string;
  role: string;
  isOwner: boolean;
  planName: string | null;
  stripeCustomerId?: string | null;
  emailVerifiedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt: string | Date | null;
  subscriptionStart?: string | Date | null;
  subscriptionEnd?: string | Date | null;
  subscriptionStatus?: string | null;
};

type ActionState = {
  name?: string;
  email?: string;
  error?: string;
  success?: string;
};

type AccountFormProps = {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isPending: boolean;
};

function AccountForm({
  state,
  nameValue = '',
  emailValue = '',
  onChange,
  isPending
}: AccountFormProps) {
  return (
    <>
      <div>
        <Label htmlFor="name" className="mb-2">
          Name
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter your name"
          value={state.name || nameValue}
          onChange={onChange}
          required
          disabled={isPending}
        />
      </div>
      <div>
        <Label htmlFor="email" className="mb-2">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          value={emailValue}
          disabled
          style={{ backgroundColor: '#f3f4f6', color: '#888', cursor: 'not-allowed' }}
        />
      </div>
    </>
  );
}

function AccountFormWithData({ state }: { state: ActionState }) {
  return null; // Not used in refactored version
}

export default function GeneralPage() {
  const { data: user } = useSWR<CurrentUser>('/api/user', fetcher);
  const plan = normalizePlanName(user?.planName);
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const evtLimit = eventLimit(plan);
  const perEventPhotoLimit = photoLimitPerEvent(plan);
  const uploadMb = Math.round(uploadLimitBytes(plan) / (1024 * 1024));
  const isAdvancedGallery = plan === 'pro' || plan === 'business';
  const features = [
    `${evtLimit === null ? 'Unlimited' : evtLimit} event${evtLimit === 1 ? '' : 's'}`,
    `${perEventPhotoLimit === null ? 'Unlimited' : perEventPhotoLimit} photos per event`,
    `${uploadMb}MB per upload`,
    `${concurrentUploadLimit(plan)} concurrent uploads`,
    'Guest Photo Sharing',
    isAdvancedGallery ? 'Advanced Photo Gallery' : 'Basic Photo Gallery',
    'Photo Download & Export',
  ];
  // Subscription expiry progress bar logic
  const subscriptionStart = user?.subscriptionStart ? new Date(user.subscriptionStart) : null;
  const subscriptionEnd = user?.subscriptionEnd ? new Date(user.subscriptionEnd) : null;
  let progress = 0;
  let daysLeft = null;
  let totalDays = null;
  if (subscriptionStart && subscriptionEnd) {
    const now = new Date();
    totalDays = Math.round((subscriptionEnd.getTime() - subscriptionStart.getTime()) / (1000 * 60 * 60 * 24));
    daysLeft = Math.max(0, Math.round((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    progress = totalDays > 0 ? Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100)) : 0;
  }
  const [state, setState] = React.useState<ActionState>({ name: user?.name ?? '', email: user?.email ?? '' });
  const [isPending, setIsPending] = React.useState(false);

  React.useEffect(() => {
    setState((prev) => ({ ...prev, name: user?.name ?? '', email: user?.email ?? '' }));
  }, [user]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setState((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setState((prev) => ({ ...prev, error: undefined, success: undefined }));
    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: state.name, email: state.email })
      });
      const result = await res.json();
      if (result.error) {
        setState((prev) => ({ ...prev, error: result.error }));
      } else {
        setState((prev) => ({ ...prev, success: result.success, name: result.name }));
      }
    } catch (err) {
      setState((prev) => ({ ...prev, error: 'Failed to update account.' }));
    }
    setIsPending(false);
  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        General Settings
      </h1>

      <div className="mb-6 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-blue-50 shadow-sm p-6 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-orange-100 rounded-full p-2"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><circle cx="12" cy="13" r="4"/><line x1="12" y1="9" x2="12" y2="13"/></svg></span>
            <span className="text-2xl font-bold text-orange-800">Subscription Information</span>
          </div>
          <span className="text-gray-700 mb-2">Your current plan details are shown below.</span>
          <div className="flex flex-col gap-1 mt-2">
            <span className="font-medium text-gray-700">Plan: <span className="ml-2 text-orange-600 font-semibold">{planLabel}</span></span>
            <span className="font-medium text-gray-700">Email: <span className="ml-2">{user?.email}</span></span>
            <span className="font-medium text-gray-700 mb-1">Features:</span>
            <ul className="mb-2 ml-2 list-none">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-gray-700 text-sm mb-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />
                  {feature}
                </li>
              ))}
            </ul>
            {plan !== 'free' && subscriptionStart && subscriptionEnd && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Start: {subscriptionStart.toLocaleDateString()}</span>
                  <span>End: {subscriptionEnd.toLocaleDateString()}</span>
                </div>
                <div className="w-full h-3 bg-orange-100 rounded-full overflow-hidden">
                  <div
                    className="h-3 bg-orange-500 rounded-full"
                    style={{ width: `${progress}%`, transition: 'width 0.5s' }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span>{daysLeft} days left</span>
                  <span>{progress}% used</span>
                </div>
              </div>
            )}
            {user?.subscriptionStatus && (
              <span className="font-medium text-gray-700">Status: <span className="ml-2">{user.subscriptionStatus.charAt(0).toUpperCase() + user.subscriptionStatus.slice(1)}</span></span>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
                <a href="/dashboard/upgrade">Upgrade plan</a>
              </Button>
              {user?.stripeCustomerId ? (
                <Button asChild variant="secondary">
                  <a href="/api/stripe/portal">Manage subscription</a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <span className="rounded-full bg-blue-100 p-4 shadow-lg flex items-center justify-center" style={{ boxShadow: '0 0 0 4px #fbbf24, 0 2px 8px rgba(0,0,0,0.08)' }}>
            <span className="rounded-full bg-black flex items-center justify-center" style={{ width: 56, height: 56 }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><polygon points="16,8 24,24 8,24" fill="white"/></svg>
            </span>
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <AccountForm
              state={state}
              nameValue={user?.name ?? ''}
              emailValue={user?.email ?? ''}
              onChange={handleChange}
              isPending={isPending}
            />
            {state.error && (
              <p className="text-red-500 text-sm">{state.error}</p>
            )}
            {state.success && (
              <p className="text-green-500 text-sm">{state.success}</p>
            )}
            <Button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
