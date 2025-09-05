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
import { getPhotoCapForTeam, getUploadLimitForTeam } from '@/lib/plans';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { events as eventsTable, teamMembers, photos as photosTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deleteFromS3, deriveThumbKey } from '@/lib/s3';
import { generateAccessCode } from '@/lib/events/actions';

interface EventPageProps {
  params: Promise<{ code: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { code } = await params;
  const raw = (code || '').toString();
  const upper = raw.toUpperCase();
  const isNumericId = /^[0-9]+$/.test(raw);
  // Need team info; re-query with team relation
  let event = await getEventByEventCode(upper);
  // Fallback: if user visited /dashboard/events/{id}, redirect to the code route
  if (!event && isNumericId) {
    const byId = await db.query.events.findFirst({ where: eq(eventsTable.id, Number(raw)), columns: { id: true, eventCode: true } });
    if (byId?.eventCode) {
      return redirect(`/dashboard/events/${byId.eventCode}`);
    }
  }
  if (event) {
    // Ensure team is loaded (getEventByEventCode may not include team)
    if (!(event as any).team) {
      const full = await db.query.events.findFirst({
        where: eq(eventsTable.id, event.id),
        with: { createdBy: { columns: { id: true, name: true, email: true } }, team: { columns: { id: true, name: true, planName: true } } }
      });
      // @ts-ignore
      event = full as any;
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
  // Analytics: guest activity and contributors
  const guestUploads = (photos as any[])?.filter((p) => !p.uploadedBy)?.length || 0;
  const memberUploads = photoCount - guestUploads;
  const guestPct = photoCount > 0 ? Math.round((guestUploads / photoCount) * 100) : 0;
  // Top contributors (by user or guest)
  const contributorMap = new Map<string, number>();
  for (const p of (photos as any[])) {
    const key = p.uploadedByUser?.name || p.guestName || 'Guest';
    contributorMap.set(key, (contributorMap.get(key) || 0) + 1);
  }
  const topContributors = Array.from(contributorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
  // Simple uploads-per-day trend (last 7 days)
  const end = new Date();
  end.setHours(0, 0, 0, 0); // midnight today
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  // Create buckets for each day
  const dayBuckets: { label: string; count: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    dayBuckets.push({ label, count: 0 });
  }
  // Fill buckets with photo upload counts
  for (const p of (photos as any[])) {
    const d = new Date(p.uploadedAt);
    d.setHours(0, 0, 0, 0); // compare by day only
    for (let i = 0; i < 7; i++) {
      const bucketDate = new Date(start);
      bucketDate.setDate(start.getDate() + i);
      bucketDate.setHours(0, 0, 0, 0);
      if (d.getTime() === bucketDate.getTime()) {
        dayBuckets[i].count += 1;
        break;
      }
    }
  }
  const maxDay = Math.max(1, ...dayBuckets.map((b) => b.count));
  const planUploadLimit = getUploadLimitForTeam((event as any).team?.planName ?? null);
  const planPhotoCap = getPhotoCapForTeam((event as any).team?.planName ?? null);
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
    const membership = await db.query.teamMembers.findFirst({ where: eq(teamMembers.userId, u.id) });
    const isTeamOwner = (membership?.role ?? '').toLowerCase() === 'owner';
    if (!isCreator && !isTeamOwner && !u.isOwner) {
      return redirect(`/dashboard/events/${existing.eventCode}?error=${encodeURIComponent('You do not have permission to delete this event')}`);
    }

    const ok = confirmText === existing.name || confirmText === existing.accessCode || confirmText.toUpperCase() === 'DELETE';
    if (!ok) {
      return redirect(`/dashboard/events/${existing.eventCode}?error=${encodeURIComponent('Confirmation text does not match. Type the event name, access code, or DELETE.')}`);
    }

    const eventPhotos = await db.select().from(photosTable).where(eq(photosTable.eventId, eventId));
    for (const p of eventPhotos) {
      try {
        if (p.filePath?.startsWith('s3:')) {
          const key = p.filePath.replace(/^s3:/, '');
          await deleteFromS3(key).catch(() => {});
          const sm = deriveThumbKey(key, 'sm');
          const md = deriveThumbKey(key, 'md');
          await deleteFromS3(sm).catch(() => {});
          await deleteFromS3(md).catch(() => {});
        } else if (p.filePath) {
          const { join } = await import('path');
          const fs = (await import('fs')).promises;
          const filePath = join(process.cwd(), 'public', p.filePath);
          await fs.unlink(filePath).catch(() => {});
        }
      } catch {}
    }

    await db.delete(photosTable).where(eq(photosTable.eventId, eventId));
    await db.delete(eventsTable).where(eq(eventsTable.id, eventId));

    redirect('/dashboard/events?deleted=1');
  }

  async function regenerateAccessCode(formData: FormData) {
    'use server';
    const eventId = Number(formData.get('eventId'));
    const u = await getUser();
  if (!u) return redirect('/api/auth/google');
    const existing = await db.query.events.findFirst({ where: eq(eventsTable.id, eventId) });
    if (!existing) return redirect(`/dashboard/events?error=${encodeURIComponent('Event not found')}`);
    const isCreator = existing.createdBy === u.id;
    const membership = await db.query.teamMembers.findFirst({ where: eq(teamMembers.userId, u.id) });
    const isTeamOwner = (membership?.role ?? '').toLowerCase() === 'owner';
    if (!isCreator && !isTeamOwner && !u.isOwner) {
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
            {/* Event Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Event Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-gray-50">
                    <div className="text-xs text-gray-500">Total Photos</div>
                    <div className="text-xl font-semibold">{photoCount}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <div className="text-xs text-gray-500">Approved</div>
                    <div className="text-xl font-semibold">{approvedCount}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <div className="text-xs text-gray-500">Guest Uploads</div>
                    <div className="text-xl font-semibold">{guestUploads}</div>
                    <div className="text-xs text-gray-500">{guestPct}% of total</div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <div className="text-xs text-gray-500">Members Uploads</div>
                    <div className="text-xl font-semibold">{memberUploads}</div>
                  </div>
                </div>

                {/* 7-day trend */}
                <div className="mt-6">
                  <div className="text-sm font-medium mb-2">Uploads (last 7 days)</div>
                  <div className="flex items-end gap-2 h-24">
                    {dayBuckets.map((b, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 w-8">
                        <div
                          className="w-full bg-amber-500 rounded-sm"
                          style={{ height: `${Math.max(4, Math.round((b.count / maxDay) * 100))}%` }}
                          title={`${b.count} uploads`}
                        />
                        <div className="text-[10px] text-gray-500 text-center leading-3">{b.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top contributors */}
                <div className="mt-6">
                  <div className="text-sm font-medium mb-2">Top Contributors</div>
                  {topContributors.length === 0 ? (
                    <div className="text-sm text-gray-500">No uploads yet</div>
                  ) : (
                    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
                      {topContributors.map((c, i) => (
                        <li key={i} className="flex items-center justify-between px-3 py-2 bg-white">
                          <span className="text-sm text-gray-700 truncate">{c.name}</span>
                          <span className="text-sm font-medium">{c.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
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
            <PhotoUpload eventId={eventId} teamPlanName={(event as any).team?.planName ?? null} />

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
                  canManage={true}
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
                  <span className="font-medium capitalize">{((event as any).team?.planName || 'free').toLowerCase()}</span>
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
                        ? 'bg-amber-100 text-amber-800' 
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
                  <Link href={`/events/${eventCode}`} target="_blank">
                    <Button size="sm" className="px-3 py-1.5 text-sm">
                      View Guest Page
                    </Button>
                  </Link>
                </div>

                {isEventOwner && !event.isPublic && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Access Code</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{event.accessCode}</span>
                      <form action={regenerateAccessCode}>
                        <input type="hidden" name="eventId" value={String(eventId)} />
                        <Button size="sm" variant="outline">Regenerate</Button>
                      </form>
                    </div>
                    <p className="text-xs text-gray-500">Share this 6-character code with guests to access a private event.</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Guest QR Code</p>
                    <EventQr code={eventCode} size={160} compact />
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
