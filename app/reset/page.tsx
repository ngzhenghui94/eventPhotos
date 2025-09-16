"use client";

import { useState, useTransition } from 'react';
import { requestPasswordReset } from '../(login)/actions';

export default function ResetRequestPage() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="min-h-[80dvh] flex items-center justify-center p-6">
      <form
        className="bg-white p-6 rounded-lg shadow w-full max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          start(async () => {
            const form = new FormData();
            form.set('email', email);
            const res: any = await requestPasswordReset({}, Object.fromEntries(form.entries()) as any);
            setMsg(res?.success ?? res?.error ?? null);
          });
        }}
      >
        <h1 className="text-xl font-semibold mb-4">Reset your password</h1>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 mb-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500" required />
        {msg && <p className="text-sm mb-3 text-gray-700">{msg}</p>}
        <button disabled={pending} className="w-full py-2 rounded-md bg-orange-600 text-white">{pending ? 'Sending…' : 'Send reset link'}</button>
      </form>
    </div>
  );
}
