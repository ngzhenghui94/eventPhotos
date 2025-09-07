export const dynamic = "force-dynamic";
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { brand } from '@/lib/brand';
import { getUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import { Toaster } from '@/components/ui/sonner';
import { Home, Camera } from 'lucide-react';
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: `${brand.productName} - Photo Sharing for Events`,
  description: 'Share and collect photos from your events with guests easily.',
  openGraph: {
    siteName: brand.productName,
    url: brand.siteUrl,
    title: `${brand.productName} - Photo Sharing for Events`,
    description: 'Share and collect photos from your events with guests easily.'
  },
  twitter: {
    card: 'summary_large_image',
    title: `${brand.productName} - Photo Sharing for Events`,
    description: 'Share and collect photos from your events with guests easily.'
  }
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
      <Analytics/>
      <body className="min-h-[100dvh] bg-gray-50">
        <SWRConfig
          value={{
            fallback: {
              // We do NOT await here
              // Only components that read this data will suspend
              '/api/user': getUser()
            }
          }}
        >
          {children}
          <footer className="mt-12 border-t bg-gray-950 text-gray-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-center gap-3 text-sm">
              <p>
                &copy; {new Date().getFullYear()} Danielninetyfour. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <a
                  href="https://danielninetyfour.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white"
                >
                  <Home className="h-4 w-4" />
                  <span>Main</span>
                </a>
                <a
                  href="https://photography.danielninetyfour.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white"
                >
                  <Camera className="h-4 w-4" />
                  <span>Photography</span>
                </a>
              </div>
            </div>
          </footer>
          <Toaster position="top-center" richColors />
          <script dangerouslySetInnerHTML={{__html:`window.__EP_TOAST = { error: (...a)=>window.sonner?.error?.(...a), success: (...a)=>window.sonner?.success?.(...a) };`}} />
        </SWRConfig>
      </body>
    </html>
  );
}
