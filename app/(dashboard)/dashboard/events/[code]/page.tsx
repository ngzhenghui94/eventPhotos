// ...existing code...
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { getEventByEventCode, getPhotosForEvent, getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { PhotoUpload } from '@/components/photo-upload';
import { PhotoGallery } from '@/components/photo-gallery';
import { PhotoApproval } from '@/components/photo-approval';
import { BulkDownload } from '@/components/bulk-download';
import { EventQr } from '@/components/event-qr';
import UpdateToast from '@/components/update-toast';
import { uploadLimitBytes, normalizePlanName } from '@/lib/plans';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { events as eventsTable, photos as photosTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deleteFromS3, deriveThumbKey } from '@/lib/s3';
import { generateAccessCode } from '@/lib/events/actions';

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const raw = (code || '').toString();
  const upper = raw.toUpperCase();
  const isNumericId = /^[0-9]+$/.test(raw);
  // Get event
  let event = await getEventByEventCode(upper);
  // Fallback: if user visited /dashboard/events/{id}, redirect to the code route
  if (!event && isNumericId) {
    const byId = await db.query.events.findFirst({ where: eq(eventsTable.id, Number(raw)), columns: { id: true, eventCode: true } });
    if (byId?.eventCode) {
      return redirect(`/dashboard/events/${byId.eventCode}`);
    }
  }
  const user = await getUser();

  if (!event || !user) {
    redirect('/dashboard/events');
  }

  const eventId = event.id;
  const eventCode = event.eventCode;
  const photos = await getPhotosForEvent(eventId);

  const eventDate = new Date(event.date);
  const photoCount = photos?.length || 0;
  const approvedCount = (photos as any[])?.filter((p) => p.isApproved)?.length || 0;
  // Use user's planName for limits and caps
  const planName = normalizePlanName(user?.planName ?? 'free');
  const planUploadLimit = uploadLimitBytes(planName);
  function photoCapPerEvent(plan: string) {
    switch (plan) {
      case 'free': return 20;
      case 'starter': return 50;
      case 'hobby': return 100;
      case 'pro': return 500;
      case 'business':
      default: return 1000;
    }
  }
  const planPhotoCap = photoCapPerEvent(planName);
  const usedPct = Math.min(100, Math.round((photoCount / planPhotoCap) * 100));
  const isEventOwner = user.id === event.createdBy.id || !!user.isOwner;

  async function saveEvent(formData: FormData) {
    'use server';
    const eventId = Number(formData.get('eventId'));
    const name = String(formData.get('name') ?? '').trim();
    const isPublic = !!formData.get('isPublic');
    const allowGuestUploads = !!formData.get('allowGuestUploads');
    const requireApproval = !!formData.get('requireApproval');

    const existing = await db.query.events.findFirst({ where: eq(eventsTable.id, eventId) });
    if (!existing) return;
    const u = await getUser();
    if (!u) return;
  const isCreator = existing.createdBy === u.id;
  if (!isCreator) return;

    await db.update(eventsTable)
      .set({
        name: name || existing.name,
        isPublic,
        allowGuestUploads,
        requireApproval,
        updatedAt: new Date(),
      })
      .where(eq(eventsTable.id, eventId));
    const refreshed = await db.query.events.findFirst({ where: eq(eventsTable.id, eventId) });
    const ec = refreshed?.eventCode ?? existing.eventCode;
    revalidatePath(`/dashboard/events/${ec}`);
    redirect(`/dashboard/events/${ec}?updated=1`);
  }

  async function deleteEventAction(formData: FormData) {
    'use server';
    const eventId = Number(formData.get('eventId'));
    const confirmText = String(formData.get('confirmText') ?? '').trim();
    const u = await getUser();
    if (!u) return redirect('/api/auth/google');

    const existing = await db.query.events.findFirst({ where: eq(eventsTable.id, eventId) });
    if (!existing) return redirect(`/dashboard/events?error=${encodeURIComponent('Event not found')}`);

    const isCreator = existing.createdBy === u.id;
    if (!isCreator && !u.isOwner) {
      return redirect(`/dashboard/events/${existing.eventCode}?error=${encodeURIComponent('You do not have permission to delete this event')}`);
    }

    const ok = confirmText === existing.name || confirmText === existing.accessCode || confirmText.toUpperCase() === 'DELETE';
  }

  async function regenerateAccessCode(formData: FormData) {
    'use server';
    const eventId = Number(formData.get('eventId'));
    const u = await getUser();
    if (!u) return redirect('/api/auth/google');
    const existing = await db.query.events.findFirst({ where: eq(eventsTable.id, eventId) });
    if (!existing) return redirect(`/dashboard/events?error=${encodeURIComponent('Event not found')}`);
    const isCreator = existing.createdBy === u.id;
    if (!isCreator && !u.isOwner) {
      return redirect(`/dashboard/events/${existing.eventCode}?error=${encodeURIComponent('You do not have permission to update access code')}`);
    }
    const code = generateAccessCode();
    await db.update(eventsTable).set({ accessCode: code, updatedAt: new Date() }).where(eq(eventsTable.id, eventId));
    redirect(`/dashboard/events/${existing.eventCode}?updated=1`);
  }

  const toMB = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;
  return (
    <section className="flex-1 p-4 lg:p-8">
      <UpdateToast />
      <div className="max-w-6xl mx-auto">
        {/* NavBar - event title removed */}
        <div className="relative z-50 flex items-center mb-6 bg-white">
          <Link href="/dashboard/events">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Events
            </Button>
          </Link>
        </div>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Event Details - shifted up */}
          {/* Redesigned Event Details card */}
          <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-orange-50 shadow-sm px-6 py-6 flex flex-col gap-2">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-blue-100 rounded-full p-2">
                <MapPin className="w-6 h-6 text-blue-600" />
              </span>
              <span className="font-bold text-2xl text-blue-900">{event?.name || 'Untitled Event'}</span>
              {event?.location && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-base font-semibold ml-2">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  {event.location}
                </span>
              )}
            </div>
            <div className="mt-2">
              {event?.description ? (
                <p className="text-gray-700 text-lg leading-relaxed">{event.description}</p>
              ) : (
                <p className="text-gray-400 italic text-base">No description provided</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Stats - compact */}
            <div className="rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-blue-50 shadow-sm px-6 py-6 flex flex-col gap-2">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-orange-100 rounded-full p-2">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><circle cx="12" cy="13" r="4"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
                </span>
                <span className="font-bold text-2xl text-orange-900">Event Stats</span>
                <span className="ml-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-base font-semibold">
                  {planName.charAt(0).toUpperCase() + planName.slice(1)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm text-gray-700">
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-orange-700">Host</span>
                  <span className="font-medium">{event?.createdBy?.name || 'Unknown'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-orange-700">Date</span>
                  <span className="font-medium">{eventDate?.toLocaleDateString?.()}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-orange-700">Upload Limit</span>
                  <span className="font-medium">{toMB(planUploadLimit)}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-orange-700">Total Photos</span>
                  <span className="font-medium">{photoCount}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-orange-700">Approved Photos</span>
                  <span className="font-medium">{approvedCount}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-orange-700">Photo Cap</span>
                  <span className="font-medium">{planPhotoCap}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className="flex-1 h-2 rounded bg-gray-100 overflow-hidden">
                  <div className="h-2 bg-orange-500" style={{ width: `${usedPct}%` }} />
                </div>
                <span className="text-xs text-gray-700 font-medium">{photoCount} / {planPhotoCap} used</span>
              </div>
            </div>
            {/* Event Settings - moved beside stats */}
            {/* Redesigned Event Settings card */}
            <div className="rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-orange-50 shadow-sm px-6 py-6 flex flex-col gap-2">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-green-100 rounded-full p-2">
                  <Calendar className="w-6 h-6 text-green-600" />
                </span>
                <span className="font-bold text-2xl text-green-900">Event Settings</span>
              </div>
              <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm text-gray-700">
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-green-700">Access Code</span>
                  <span className="font-mono font-medium">{event?.accessCode}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-green-700">Public Event</span>
                  <span className="font-medium">{event?.isPublic ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-green-700">Guest Uploads</span>
                  <span className="font-medium">{event?.allowGuestUploads ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-green-700">Approval Required</span>
                  <span className="font-medium">{event?.requireApproval ? 'Yes' : 'No'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Link href={`/events/${eventCode}`} target="_blank">
                  <Button size="sm" className="px-3 py-1.5 text-sm">View Guest Page</Button>
                </Link>
              </div>
              <div className="mt-4">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Guest QR Code</p>
                  <EventQr code={eventCode} size={160} compact />
                </div>
              </div>
              {isEventOwner && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Edit Event</p>
                  <form action={saveEvent} className="space-y-3">
                    <input type="hidden" name="eventId" value={String(eventId)} />
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" defaultValue={event?.name} required maxLength={200} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="isPublic">Public</Label>
                        <p className="text-xs text-gray-500">Visible to anyone with the link</p>
                      </div>
                      <input id="isPublic" name="isPublic" type="checkbox" defaultChecked={!!event?.isPublic} className="h-4 w-4" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="allowGuestUploads">Guest uploads</Label>
                        <p className="text-xs text-gray-500">Allow guests to upload photos</p>
                      </div>
                      <input id="allowGuestUploads" name="allowGuestUploads" type="checkbox" defaultChecked={!!event?.allowGuestUploads} className="h-4 w-4" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="requireApproval">Require approval</Label>
                        <p className="text-xs text-gray-500">New uploads need approval</p>
                      </div>
                      <input id="requireApproval" name="requireApproval" type="checkbox" defaultChecked={!!event?.requireApproval} className="h-4 w-4" />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button type="submit" size="sm" variant="default">Save Event Settings</Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
          {/* Event Details */}
          {/* Event Details - shifted up (removed from here) */}
          {/* Photo Upload */}
          <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-orange-50 shadow-sm px-6 py-6 flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-purple-100 rounded-full p-2">
                <Users className="w-6 h-6 text-purple-600" />
              </span>
              <span className="font-bold text-2xl text-purple-900">Upload Photos</span>
            </div>
            <PhotoUpload eventId={eventId} planName={planName} />
          </div>
          {/* Photo Approval */}
          {event?.requireApproval && (
            <PhotoApproval photos={photos || []} eventId={eventId} />
          )}
          {/* Photo Gallery */}
          <div className="rounded-xl border border-pink-200 bg-gradient-to-r from-pink-50 to-orange-50 shadow-sm px-6 py-6 flex flex-col gap-2 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="bg-pink-100 rounded-full p-2">
                  <Users className="w-6 h-6 text-pink-600" />
                </span>
                <span className="font-bold text-2xl text-pink-900">Approved Photos</span>
                <span className="ml-2 px-3 py-1 rounded-full bg-pink-50 text-pink-700 text-base font-semibold">
                  {photos?.filter((p: any) => p.isApproved).length || 0} Approved
                </span>
              </div>
              <BulkDownload photos={(photos as any[])?.filter((p) => p.isApproved) || []} />
            </div>
            <PhotoGallery
              photos={(photos as any[])?.filter((p) => p.isApproved) || []}
              eventId={eventId}
              currentUserId={user?.id}
              canManage={true}
            />
          </div>

          {/* Danger Zone */}
          {isEventOwner && (
            <div className="pt-6 mt-2 border-t">
              <p className="text-sm font-medium text-red-600 mb-2">Danger Zone</p>
              <div className="text-xs text-gray-600 mb-3">
                Deleting this event will permanently remove all photos and cannot be undone.
              </div>
              <form action={deleteEventAction as any} className="space-y-3">
                <input type="hidden" name="eventId" value={String(eventId)} />
                <div className="space-y-1.5">
                  <Label htmlFor="confirmText">Type the event name, access code, or DELETE to confirm</Label>
                  <Input id="confirmText" name="confirmText" placeholder={event?.name} />
                </div>
                <div className="flex justify-end">
                  <Button variant="destructive" size="sm" type="submit">Delete Event</Button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
