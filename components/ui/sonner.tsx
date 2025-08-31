"use client";
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

export function Toaster(props: React.ComponentProps<typeof SonnerToaster>) {
  return <SonnerToaster {...props} />;
}

export const toast = {
  success: (message: string, opts?: any) => sonnerToast.success(message, opts),
  error: (message: string, opts?: any) => sonnerToast.error(message, opts),
  info: (message: string, opts?: any) => sonnerToast(message, opts),
  warning: (message: string, opts?: any) => sonnerToast.warning?.(message, opts) ?? sonnerToast(message, opts),
};
