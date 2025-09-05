'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { updateAccount } from '@/app/(login)/actions';
import useSWR from 'swr';
import { Suspense } from 'react';

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
  emailVerifiedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt: string | Date | null;
  teamId: number | null;
  teamName: string | null;
};

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

function AccountFormWithData({ state }: { state: ActionState }) {
  const { data: user } = useSWR<CurrentUser>('/api/user', fetcher);
  return (
    <AccountForm
      state={state}
      nameValue={user?.name ?? ''}
      emailValue={user?.email ?? ''}
    />
  );
}

export default function GeneralPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  );

  const { data: user } = useSWR<CurrentUser>('/api/user', fetcher);
  const planName = user?.planName || 'free';
  const teamName = user?.teamName || 'No team';
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
          <span className="text-gray-700 mb-2">Your current plan and team details are shown below.</span>
          <div className="flex flex-col gap-1 mt-2">
            <span className="font-medium text-gray-700">Plan: <span className="ml-2 text-orange-600 font-semibold">{planName.charAt(0).toUpperCase() + planName.slice(1)}</span></span>
            <span className="font-medium text-gray-700">Team: <span className="ml-2">{teamName}</span></span>
            <span className="font-medium text-gray-700">Email: <span className="ml-2">{user?.email}</span></span>
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
          <form className="space-y-4" action={formAction}>
            <AccountFormWithData state={state} />
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
