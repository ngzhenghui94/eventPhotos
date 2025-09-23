export const dynamic = "force-dynamic";
import SiteHeader from '@/components/site-header';
import DemoGalleryContent from '@/components/demo-gallery-content';
import { Suspense } from 'react';

export default function DemoGallery() {
  return (
    <>
      <SiteHeader />
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
          </div>
        }
      >
        <DemoGalleryContent />
      </Suspense>
    </>
  );
}