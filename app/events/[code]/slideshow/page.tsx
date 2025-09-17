export const dynamic = "force-dynamic";
import { getEventByEventCode, getPhotosForEvent } from '@/lib/db/queries';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
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
    <div className="min-h-screen w-full bg-black text-white">
      <SlideshowClient photos={photos.map(p => ({ id: p.id, name: p.originalFilename }))} accessCode={event.isPublic ? undefined : accessCodeCookie} />
    </div>
  );
}


