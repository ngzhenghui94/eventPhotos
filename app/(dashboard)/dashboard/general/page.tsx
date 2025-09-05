// ...existing code...
// ...existing code...
// ...existing code...
// ...existing code...
'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { updateAccount } from '@/app/(login)/actions';
import { User } from '@/lib/db/schema';
import useSWR from 'swr';
import { Suspense } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const dashboardFetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
  name?: string;
  error?: string;
  success?: string;
};

type AccountFormProps = {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
};

function AccountForm({
  state,
  nameValue = '',
  emailValue = ''
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
          defaultValue={state.name || nameValue}
          required
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
          defaultValue={emailValue}
          required
        />
      </div>
    </>
  );
}

function AccountFormWithData({ state, user }: { state: ActionState; user?: User }) {
  return (
    <AccountForm
      state={state}
      nameValue={user?.name ?? ''}
      emailValue={user?.email ?? ''}
    />
  );
}

import Link from 'next/link';
function DashboardInfoCard({ team }: { team: any }) {
  if (!team) return null;
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Subscription & Team Info</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Current Plan</div>
            <div className="font-semibold text-lg text-gray-900 mb-2">{team.planName.charAt(0).toUpperCase() + team.planName.slice(1)}</div>
            <div className="text-sm text-gray-500">Subscription Status</div>
            <div className="mb-2">{team.subscriptionStatus || 'N/A'}</div>
            <div className="text-sm text-gray-500">Team Name</div>
            <div className="mb-2">{team.name}</div>
            <div className="text-sm text-gray-500">Team Members</div>
            <div className="mb-2">{team.members}</div>
            <Link href="/dashboard/upgrade" className="block mt-4">
              <Button
                className="w-full bg-gradient-to-r from-orange-400 to-orange-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:from-orange-500 hover:to-orange-700 flex items-center justify-center gap-2 transition-all duration-150"
                style={{ boxShadow: '0 2px 8px rgba(255,140,0,0.12)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M12 2l4 7h-8l4-7z"></path><path d="M2 21h20"></path><path d="M12 17v4"></path></svg>
                Upgrade Plan
              </Button>
            </Link>
          </div>
          <div>
            <div className="text-sm text-gray-500">Per-upload Size Limit</div>
            <div className="mb-2">{team.uploadLimitMB} MB</div>
            <div className="text-sm text-gray-500">Photo Cap per Event</div>
            <div className="mb-2">{team.photoCap}</div>
            <div className="text-sm text-gray-500">Event Limit</div>
            <div className="mb-2">{team.eventLimit === null ? 'Unlimited' : team.eventLimit}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GeneralPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  );
  const { data, error } = useSWR('/api/dashboard-info', dashboardFetcher, {
    dedupingInterval: 60000,
    revalidateOnFocus: false,
  });
  if (error) return null;
  if (!data) return null;
  const { user, team } = data;

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        General Settings
      </h1>
      <DashboardInfoCard team={team} />
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={formAction}>
            <Suspense fallback={<AccountForm state={state} />}>
              <AccountFormWithData state={state} user={user} />
            </Suspense>
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
