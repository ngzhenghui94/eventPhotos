"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function JoinByCode() {
  const [code, setCode] = useState('');
  const router = useRouter();

  const onJoin = (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = code.trim().toUpperCase();
    if (!value) return;
  router.push(`/events/${encodeURIComponent(value)}`);
  };

  return (
    <form onSubmit={onJoin} className="flex w-full max-w-md items-center gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter event code"
        aria-label="Event code"
        className="h-11 rounded-full px-4"
      />
      <Button type="submit" className="h-11 rounded-full">Join</Button>
    </form>
  );
}
