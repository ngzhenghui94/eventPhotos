"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/components/ui/sonner';

export default function UpdateToast() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Avoid duplicate toasts in React Strict Mode (effects can run twice)
    if (typeof window === 'undefined') return;
    const isUpdated = searchParams.get('updated') === '1';
    if (!isUpdated) return;

    const key = `updated-toast:${window.location.pathname}`;
    if (sessionStorage.getItem(key) === '1') return;

    sessionStorage.setItem(key, '1');
    toast.success('Saved changes', { id: 'event-updated' });

    const params = new URLSearchParams(searchParams.toString());
    params.delete('updated');
    const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '') + window.location.hash;
    router.replace(newUrl, { scroll: false });

    // Allow future updates to show the toast again on subsequent saves
    setTimeout(() => sessionStorage.removeItem(key), 0);
  }, [searchParams, router]);

  return null;
}
