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
    const params = new URLSearchParams(searchParams.toString());

    // Saved/updated
    if (params.get('updated') === '1') {
      const key = `updated-toast:${window.location.pathname}`;
      if (sessionStorage.getItem(key) !== '1') {
        sessionStorage.setItem(key, '1');
        toast.success('Saved changes', { id: 'event-updated' });
        params.delete('updated');
        const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '') + window.location.hash;
        router.replace(newUrl, { scroll: false });
        setTimeout(() => sessionStorage.removeItem(key), 0);
      }
    }

    // Deleted
    if (params.get('deleted') === '1') {
      const key = `deleted-toast:${window.location.pathname}`;
      if (sessionStorage.getItem(key) !== '1') {
        sessionStorage.setItem(key, '1');
        toast.success('Event deleted', { id: 'event-deleted' });
        params.delete('deleted');
        const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '') + window.location.hash;
        router.replace(newUrl, { scroll: false });
        setTimeout(() => sessionStorage.removeItem(key), 0);
      }
    }

    // Error message
    const err = params.get('error');
    if (err) {
      const key = `error-toast:${window.location.pathname}:${err}`;
      if (sessionStorage.getItem(key) !== '1') {
        sessionStorage.setItem(key, '1');
        toast.error(err, { id: 'page-error' });
        params.delete('error');
        const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '') + window.location.hash;
        router.replace(newUrl, { scroll: false });
        setTimeout(() => sessionStorage.removeItem(key), 0);
      }
    }
  }, [searchParams, router]);

  return null;
}
