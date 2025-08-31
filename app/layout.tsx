import './globals.css';
import type { Metadata, Viewport } from 'next';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'MemoriesVault - Photo Sharing for Events',
  description: 'Share and collect photos from your events with guests easily.'
};

export const viewport: Viewport = {
  maximumScale: 1
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="bg-white dark:bg-gray-950 text-black dark:text-white"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <body className="min-h-[100dvh] bg-gray-50">
        <SWRConfig
          value={{
            fallback: {
              // We do NOT await here
              // Only components that read this data will suspend
              '/api/user': getUser(),
              '/api/team': getTeamForUser()
            }
          }}
        >
          {children}
          <Toaster position="top-center" richColors />
          <script dangerouslySetInnerHTML={{__html:`window.__EP_TOAST = { error: (...a)=>window.sonner?.error?.(...a), success: (...a)=>window.sonner?.success?.(...a) };`}} />
        </SWRConfig>
      </body>
    </html>
  );
}
