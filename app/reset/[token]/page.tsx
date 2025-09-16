"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetWithTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="min-h-[80dvh] flex items-center justify-center p-6">
      <form
        className="bg-white p-6 rounded-lg shadow w-full max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          start(async () => {
            const form = new FormData();
            const { token } = await params;
            form.set('token', token);
            form.set('password', password);
            try {
              const res = await fetch('/api/auth/password/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(form.entries() as any)),
              });
              const json = await res.json();
              if (!res.ok) {
                setMsg(json?.error || 'Reset failed');
                return;
              }
              setMsg(json?.success || 'Password updated');
              router.push('/sign-in');
            } catch (e: any) {
              setMsg(e?.message || 'Network error');
            }
          });
        }}
      >
        <h1 className="text-xl font-semibold mb-4">Choose a new password</h1>
        <label className="block text-sm font-medium text-gray-700">New password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 mb-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500" required />
        {msg && <p className="text-sm mb-3 text-gray-700">{msg}</p>}
        <button disabled={pending} className="w-full py-2 rounded-md bg-orange-600 text-white">{pending ? 'Updating…' : 'Update password'}</button>
      </form>
    </div>
  );
}
