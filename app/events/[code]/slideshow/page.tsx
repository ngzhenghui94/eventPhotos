export const dynamic = "force-dynamic";
import { getEventByEventCode, getPhotosForEvent } from '@/lib/db/queries';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SlideshowClient from '@/components/slideshow-client';

interface SlideshowProps { params: Promise<{ code: string }> }

export default async function SlideshowPage({ params }: SlideshowProps) {
  const { code } = await params;
  const event = await getEventByEventCode(code.toUpperCase());
  if (!event) return notFound();

  const cookieKey = `evt:${event.eventCode}:access`;
  const cookieStore = await cookies();
  const accessCodeCookie = cookieStore.get(cookieKey)?.value || '';
  const hasAccess = event.isPublic || (!!accessCodeCookie && accessCodeCookie.toUpperCase() === event.accessCode.toUpperCase());

  if (!hasAccess) {
    // Require unlocking via access code on the guest page before viewing slideshow
    return redirect(`/events/${event.eventCode}`);
  }

  const photos = (await getPhotosForEvent(event.id)).filter(p => p.isApproved);

  return (
    <div className="fixed inset-0 w-full h-full bg-black text-white overflow-hidden">
      <Link
        href={`/events/${event.eventCode}`}
        className="absolute top-4 left-4 z-50 inline-flex items-center gap-2 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 backdrop-blur text-white text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Event
      </Link>
      <SlideshowClient
        photos={photos.map(p => ({ id: p.id, name: p.originalFilename }))}
        accessCode={event.isPublic ? undefined : accessCodeCookie}
        showControls={true}
      />
    </div>
  );
}


