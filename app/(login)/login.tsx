'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { CircleIcon } from 'lucide-react';
import { useState, useTransition } from 'react';

type ActionResult = { error?: string; success?: string; redirect?: string } | any;

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get('redirect');
  const googleHref = `/api/auth/google${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      try {
        const endpoint = mode === 'signin' ? '/api/auth/password/signin' : '/api/auth/password/signup';
        const body: any = { email, password };
        if (mode === 'signup') body.name = name;
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = await res.json();
        if (!res.ok) {
          setMessage(json?.error || 'Something went wrong');
          return;
        }
        setMessage(json?.success || null);
        if (json?.redirect) router.push(json.redirect);
      } catch (e: any) {
        setMessage(e?.message || 'Network error');
      }
    });
  }

  async function handleForgotPassword() {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/password/reset-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const json = await res.json();
        setMessage(json?.success || json?.error || null);
      } catch (e: any) {
        setMessage(e?.message || 'Network error');
      }
    });
  }

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {mode === 'signin' ? 'Sign in' : 'Create your account'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <a
          href={googleHref}
          className="w-full flex justify-center py-2 px-4 mb-5 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          Continue with Google
        </a>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
          {mode === 'signup' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500" required />
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500" required />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500" required />
          </div>
          {message && <p className="text-sm mb-3 text-gray-700">{message}</p>}
          <button disabled={pending} type="submit" className="w-full flex justify-center py-2 px-4 mb-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
            {pending ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
          {mode === 'signin' && (
            <button disabled={pending} type="button" onClick={handleForgotPassword} className="w-full text-center text-sm text-orange-600 hover:underline">
              Forgot your password?
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
