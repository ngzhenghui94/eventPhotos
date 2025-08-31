import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { getEventById, getPhotosForEvent, getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { PhotoUpload } from '@/components/photo-upload';
import { PhotoGallery } from '@/components/photo-gallery';
import { PhotoApproval } from '@/components/photo-approval';
import { BulkDownload } from '@/components/bulk-download';
import { EventQr } from '@/components/event-qr';
import UpdateToast from '@/components/update-toast';
import { getPhotoCapForTeam, getUploadLimitForTeam } from '@/lib/plans';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { events as eventsTable, teamMembers, photos as photosTable, ActivityType } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deleteFromS3, deriveThumbKey } from '@/lib/s3';

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const eventId = parseInt(id);
  
  if (isNaN(eventId)) {
    redirect('/dashboard/events');
  }

  const [event, photos, user] = await Promise.all([
    getEventById(eventId),
    getPhotosForEvent(eventId),
    getUser()
  ]);
  
  if (!event || !user) {
    redirect('/dashboard/events');
  }

  const eventDate = new Date(event.date);
  const photoCount = photos?.length || 0;
  const approvedCount = (photos as any[])?.filter((p) => p.isApproved)?.length || 0;
  const planUploadLimit = getUploadLimitForTeam(event.team.planName ?? null);
  const planPhotoCap = getPhotoCapForTeam(event.team.planName ?? null);
  const usedPct = Math.min(100, Math.round((photoCount / planPhotoCap) * 100));
  // createdBy is a user object in this query result; compare its id
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
  const membership = await db.query.teamMembers.findFirst({ where: eq(teamMembers.userId, u.id) });
    const isTeamOwner = (membership?.role ?? '').toLowerCase() === 'owner';
    if (!isCreator && !isTeamOwner) return;

    await db.update(eventsTable)
      .set({
        name: name || existing.name,
        isPublic,
        allowGuestUploads,
        requireApproval,
        updatedAt: new Date(),
      })
      .where(eq(eventsTable.id, eventId));
  revalidatePath(`/dashboard/events/${eventId}`);
  redirect(`/dashboard/events/${eventId}?updated=1`);
  }

  async function deleteEventAction(formData: FormData) {
    'use server';
    const eventId = Number(formData.get('eventId'));
    const confirmText = String(formData.get('confirmText') ?? '').trim();
    const u = await getUser();
    if (!u) return redirect('/sign-in');

    const existing = await db.query.events.findFirst({ where: eq(eventsTable.id, eventId) });
    if (!existing) return redirect(`/dashboard/events?error=${encodeURIComponent('Event not found')}`);

    // Permission: creator or team owner
    const isCreator = existing.createdBy === u.id;
    const membership = await db.query.teamMembers.findFirst({ where: eq(teamMembers.userId, u.id) });
    const isTeamOwner = (membership?.role ?? '').toLowerCase() === 'owner';
    if (!isCreator && !isTeamOwner && !u.isOwner) {
      return redirect(`/dashboard/events/${eventId}?error=${encodeURIComponent('You do not have permission to delete this event')}`);
    }

    // Double confirmation: must match event name or access code or literal DELETE
    const ok = confirmText === existing.name || confirmText === existing.accessCode || confirmText.toUpperCase() === 'DELETE';
    if (!ok) {
      return redirect(`/dashboard/events/${eventId}?error=${encodeURIComponent('Confirmation text does not match. Type the event name, access code, or DELETE.')}`);
    }

    // Collect photo keys for deletion
    const eventPhotos = await db.select().from(photosTable).where(eq(photosTable.eventId, eventId));

    // Delete S3/local files best-effort
    for (const p of eventPhotos) {
      try {
        if (p.filePath?.startsWith('s3:')) {
          const key = p.filePath.replace(/^s3:/, '');
          await deleteFromS3(key).catch(() => {});
          // attempt to delete thumbnails
          const sm = deriveThumbKey(key, 'sm');
          const md = deriveThumbKey(key, 'md');
          await deleteFromS3(sm).catch(() => {});
          await deleteFromS3(md).catch(() => {});
        } else if (p.filePath) {
          // local public file fallback
          const { join } = await import('path');
          const fs = (await import('fs')).promises;
          const filePath = join(process.cwd(), 'public', p.filePath);
          await fs.unlink(filePath).catch(() => {});
        }
      } catch {}
    }

    // Delete DB rows: photos then event
    await db.delete(photosTable).where(eq(photosTable.eventId, eventId));
    await db.delete(eventsTable).where(eq(eventsTable.id, eventId));

    // Redirect with toast
    redirect('/dashboard/events?deleted=1');
  }

  const toMB = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

  return (
    <section className="flex-1 p-4 lg:p-8">
  <UpdateToast />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-6">
          <Link href="/dashboard/events">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Events
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg lg:text-2xl font-medium text-gray-900">
              {event.name}
            </h1>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <Calendar className="mr-1 h-3 w-3" />
              {eventDate.toLocaleDateString()}
              {event.location && (
                <>
                  <span className="mx-2">•</span>
                  <MapPin className="mr-1 h-3 w-3" />
                  {event.location}
                </>
              )}
            </div>
            <div className="text-sm text-gray-600 mt-1">Host: {event.createdBy.name || 'Unknown'}</div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-6">
            {/* Event Details */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent>
                {event.description ? (
                  <p className="text-gray-700">{event.description}</p>
                ) : (
                  <p className="text-gray-500 italic">No description provided</p>
                )}
              </CardContent>
            </Card>

            {/* Photo Upload */}
            <PhotoUpload eventId={eventId} teamPlanName={event.team.planName ?? null} />

            {/* Photo Approval */}
            {event.requireApproval && (
              <PhotoApproval photos={photos || []} eventId={eventId} />
            )}

            {/* Photo Gallery */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Approved Photos ({photos?.filter((p: any) => p.isApproved).length || 0})
                </CardTitle>
                <BulkDownload photos={(photos as any[])?.filter((p) => p.isApproved) || []} />
              </CardHeader>
              <CardContent>
                <PhotoGallery
                  photos={(photos as any[])?.filter((p) => p.isApproved) || []}
                  eventId={eventId}
                  currentUserId={user.id}
                  canManage={true} // Event owners can manage all photos
                />
              </CardContent>
            </Card>
          </div>

          {/* Event Settings Sidebar */}
          <div className="space-y-6">
            {/* Plan Limits */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Current plan</span>
                  <span className="font-medium capitalize">{event.team.planName?.toLowerCase() || 'free'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Per-upload size</span>
                  <span className="font-medium">{toMB(planUploadLimit)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Photo cap per event</span>
                  <span className="font-medium">{planPhotoCap}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Current photos</span>
                    <span className="font-medium">{photoCount} / {planPhotoCap}</span>
                  </div>
                  <div className="h-2 rounded bg-gray-100 overflow-hidden">
                    <div className="h-2 bg-orange-500" style={{ width: `${usedPct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Approved: {approvedCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Access Code</span>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {event.accessCode}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Public Event</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      event.isPublic 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {event.isPublic ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Guest Uploads</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      event.allowGuestUploads 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {event.allowGuestUploads ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Approval Required</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      event.requireApproval 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {event.requireApproval ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Link href={`/guest/${event.accessCode}`} target="_blank">
                    <Button size="sm" className="px-3 py-1.5 text-sm">
                      View Guest Page
                    </Button>
                  </Link>
                </div>

        <div className="pt-4 border-t">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Guest QR Code</p>
          <EventQr code={event.accessCode} size={160} compact />
                  </div>
                </div>

                {isEventOwner && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Edit Event</p>
                    <form action={saveEvent} className="space-y-3">
                      <input type="hidden" name="eventId" value={String(eventId)} />
                      <div className="space-y-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" defaultValue={event.name} required maxLength={200} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="isPublic">Public</Label>
                          <p className="text-xs text-gray-500">Visible to anyone with the link</p>
                        </div>
                        <input id="isPublic" name="isPublic" type="checkbox" defaultChecked={!!event.isPublic} className="h-4 w-4" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="allowGuestUploads">Guest uploads</Label>
                          <p className="text-xs text-gray-500">Allow guests to upload photos</p>
                        </div>
                        <input id="allowGuestUploads" name="allowGuestUploads" type="checkbox" defaultChecked={!!event.allowGuestUploads} className="h-4 w-4" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="requireApproval">Require approval</Label>
                          <p className="text-xs text-gray-500">New uploads need approval</p>
                        </div>
                        <input id="requireApproval" name="requireApproval" type="checkbox" defaultChecked={!!event.requireApproval} className="h-4 w-4" />
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" type="submit">Save Changes</Button>
                      </div>
                    </form>
                  </div>
                )}

                {isEventOwner && (
                  <div className="pt-6 mt-2 border-t">
                    <p className="text-sm font-medium text-red-600 mb-2">Danger Zone</p>
                    <div className="text-xs text-gray-600 mb-3">
                      Deleting this event will permanently remove all photos and cannot be undone.
                    </div>
                    <form action={deleteEventAction} className="space-y-3">
                      <input type="hidden" name="eventId" value={String(eventId)} />
                      <div className="space-y-1.5">
                        <Label htmlFor="confirmText">Type the event name, access code, or DELETE to confirm</Label>
                        <Input id="confirmText" name="confirmText" placeholder={event.name} />
                      </div>
                      <div className="flex justify-end">
                        <Button variant="destructive" size="sm" type="submit">Delete Event</Button>
                      </div>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}