'use client';

import { useSearchParams } from 'next/navigation';
import { CircleIcon } from 'lucide-react';

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  const googleHref = `/api/auth/google${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;

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
          className="w-full flex justify-center py-2 px-4 mb-3 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          Continue with Google
        </a>
        <p className="text-center text-xs text-gray-500 mt-4">
          We only support Google sign-in. No passwords required.
        </p>
      </div>
    </div>
  );
}
