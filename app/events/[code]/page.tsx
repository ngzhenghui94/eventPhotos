export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Upload, Camera, Lock } from 'lucide-react';
import { CategoryIcon } from '@/components/category-icon';
import { getEventByEventCode, getPhotosForEvent } from '@/lib/db/queries';
import { getEventTimeline } from '@/lib/db/queries';
import { Timeline } from '@/components/event-timeline';
import { redirect } from 'next/navigation';
import { GuestPhotoUpload } from '@/components/guest-photo-upload';
import { EventQr } from '@/components/event-qr';
import { env } from 'process';
import { PhotoGallery } from '@/components/photo-gallery';
import { Input } from '@/components/ui/input';
import { cookies } from 'next/headers';
import EventChat from '@/components/EventChat';

interface GuestEventPageProps { params: Promise<{ code: string }>; }

export default async function GuestEventPage({ params }: GuestEventPageProps) {
  const { code } = await params;

  // Fetch event, cookies, and timeline in parallel
  const [event, cookieStore, timelineItems] = await Promise.all([
    getEventByEventCode(code.toUpperCase()),
    cookies(),
    (async () => {
      const evt = await getEventByEventCode(code.toUpperCase());
      return evt ? await getEventTimeline(evt.id) : [];
    })(),
  ]);

  if (!event) {
    redirect('/events/not-found');
  }

  // Fetch photos in parallel with cookie logic
  const [photosRaw] = await Promise.all([
    getPhotosForEvent(event.id),
  ]);

  const cookieKey = `evt:${event.eventCode}:access`;
  const accessCodeCookie = cookieStore.get(cookieKey)?.value || '';
  const hasAccess = event.isPublic || (accessCodeCookie && accessCodeCookie.toUpperCase() === event.accessCode.toUpperCase());

  const photos = (photosRaw || []).filter((p: any) => p.isApproved);
  const eventDate = new Date(event.date);
  const photoCount = photos?.length || 0;

  // Deterministic gradient picker per event using a simple hash on event code
  const gradients = [
    'bg-gradient-to-br from-indigo-50 via-white to-pink-100',
    'bg-gradient-to-br from-emerald-50 via-white to-cyan-100',
    'bg-gradient-to-br from-yellow-50 via-white to-orange-100',
    'bg-gradient-to-br from-pink-50 via-white to-yellow-100',
    'bg-gradient-to-br from-blue-50 via-white to-violet-100',
  ];
  const pickGradient = (seed: string, offset: number = 0) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash + offset) % gradients.length;
    return gradients[idx];
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100">
      {/* Decorative */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl" />
      </div>

      {/* Header */}
      <div className="border-b border-slate-200/60 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 rounded-full p-3 ring-1 ring-amber-200/60">
              <CategoryIcon category={event.category} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-slate-900 truncate">{event.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mt-1">
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {eventDate.toLocaleDateString()}</span>
                {event.location && (
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {event.location}</span>
                )}
                <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> {photoCount} photos</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Host: {event.createdBy?.name || 'Unknown'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-8">
            {/* Event Timeline */}
            <div>
              {timelineItems && timelineItems.length > 0 ? (
                <div className="mb-8">
                  <Timeline items={timelineItems} storageKey={`tcg_timeline_collapsed:guest:${event.id}`} />
                </div>
              ) : (
                <div className="mb-8 rounded-xl border border-gray-200 bg-white px-6 py-6 text-center text-gray-400 italic">No timeline entries yet.</div>
              )}
            </div>
            {/* Event Description */}
            {event.description && (
              <Card className={`${pickGradient(event.eventCode, 0)} rounded-xl shadow-lg ring-1 ring-slate-200/60`}>
                <CardHeader>
                  <CardTitle>About This Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{event.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Photo Upload for Guests */}
            {hasAccess && event.allowGuestUploads && (
              <GuestPhotoUpload eventId={event.id} />
            )}

            {/* Photo Gallery */}
            <Card className={`${pickGradient(event.eventCode, 1)} rounded-xl shadow-lg ring-1 ring-slate-200/60`}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Event Photos ({photoCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasAccess ? (
                  <PhotoGallery
                    photos={photos || []}
                    eventId={event.id}
                    canManage={false}
                    accessCode={event.isPublic ? undefined : accessCodeCookie}
                  />
                ) : (
                  <PrivateAccessGate eventName={event.name} eventCode={event.eventCode} />
                )}
              </CardContent>
            </Card>

            {/* Event Chat */}
            <EventChat eventId={event.id} canAccess={hasAccess} />

            <Card className={`${pickGradient(event.eventCode, 2)} rounded-xl shadow-lg ring-1 ring-slate-200/60`}>
              <CardHeader>
                <CardTitle>Find out more about The Crowd Grid</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 mb-2">The Crowd Grid is a modern platform for event photo sharing, guest uploads, and secure galleries.</p>
                <a href={process.env.BASE_URL} target="_blank" rel="noopener noreferrer">
                  <Button variant="default">Learn More</Button>
                </a>
              </CardContent>
            </Card>
          </div>


          {/* Sidebar */}
          <div className="space-y-6">
            <Card className={`${pickGradient(event.eventCode, 3)} rounded-xl shadow-lg ring-1 ring-slate-200/60`}>
              <CardHeader>
                <CardTitle>Event Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="bg-gray-100 rounded-lg p-4 mb-4">
                    <p className="text-xs text-gray-500 mb-1">Event Code</p>
                    <p className="font-mono text-lg font-bold text-gray-900">
                      {event.eventCode}
                    </p>
                  </div>
                  <div className="flex flex-col items-center mb-4">
                    <EventQr code={event.eventCode} size={128} compact={true} />
                  </div>
                  <p className="text-sm text-gray-600">
                    Share this event code or QR so guests can find your event. Private events still require an access code.
                  </p>
                </div>

                {!event.allowGuestUploads && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      Guest photo uploads are currently disabled for this event.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={`${pickGradient(event.eventCode, 4)} rounded-xl shadow-lg ring-1 ring-slate-200/60`}>
              <CardHeader>
                <CardTitle>How to Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-amber-100 rounded-full p-2 flex-shrink-0">
                    <Upload className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Upload Photos</p>
                    <p className="text-xs text-gray-600">
                      {event.allowGuestUploads 
                        ? 'Drag and drop or click to upload your photos from the event'
                        : 'Photo uploads are disabled'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 rounded-full p-2 flex-shrink-0">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">View Gallery</p>
                    <p className="text-xs text-gray-600">
                      Browse and download photos from all event guests
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-purple-100 rounded-full p-2 flex-shrink-0">
                    <Camera className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Share</p>
                    <p className="text-xs text-gray-600">
                      Share the event code with friends to let them join
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${pickGradient(event.eventCode, 5)} rounded-xl shadow-lg ring-1 ring-slate-200/60`}>
              <CardHeader>
                <CardTitle>Find out more about The Crowd Grid</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 mb-2">The Crowd Grid is a modern platform for event photo sharing, guest uploads, and secure galleries.</p>
                <a href={process.env.BASE_URL} target="_blank" rel="noopener noreferrer">
                  <Button variant="default">Learn More</Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Private access prompt component
async function PrivateAccessGate({ eventName, eventCode }: { eventName: string; eventCode: string }) {
  const cookieStore = await cookies();
  const cookieKey = `evt:${eventCode}:access`;
  const existing = cookieStore.get(cookieKey)?.value || '';

  return (
    <Card className="bg-white/70 ring-1 ring-slate-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Private Event</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={async (formData) => {
          'use server';
          const input = String(formData.get('access'))?.toUpperCase().trim();
          const cookieJar = await cookies();
          if (input && input.length === 6) {
            cookieJar.set(cookieKey, input, { httpOnly: false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 });
          }
        }} className="flex items-center gap-2">
          <Input name="access" defaultValue={existing} placeholder="Enter 6-char access code" className="max-w-xs" />
          <Button type="submit">Unlock</Button>
        </form>
        <p className="text-xs text-gray-500 mt-2">Ask the host for the 6-character access code for "{eventName}".</p>
      </CardContent>
    </Card>
  );
}
