import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, MapPin, Users, QrCode, BarChart3, Clock } from 'lucide-react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import Link from 'next/link';
import { getEventByEventCode, getPhotosForEvent, getUser, getEventTimeline, getEventStats } from '@/lib/db/queries';
import { addTimelineEntry, updateTimelineEntry, deleteTimelineEntry } from './timeline-actions';
import { EventTimelineEditor } from '@/components/event-timeline-editor';
import { Timeline } from '@/components/event-timeline';
// Calendar already imported above
// Timeline UI component
// ...existing code...
import { redirect } from 'next/navigation';
import { PhotoUpload } from '@/components/photo-upload';
import { PhotoGallery } from '@/components/photo-gallery';
import { PhotoApproval } from '@/components/photo-approval';
import { BulkDownload } from '@/components/bulk-download';
import { EventQr } from '@/components/event-qr';
import RegenerateCodeButton from '@/components/regenerate-code-button';
import UpdateToast from '@/components/update-toast';
import { uploadLimitBytes, normalizePlanName, photoLimitPerEvent } from '@/lib/plans';
import { Input } from '@/components/ui/input';
import { CategoryDropdown } from '@/components/category-dropdown';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle';
import { events as eventsTable, photos as photosTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deleteFromS3, deriveThumbKey } from '@/lib/s3';
import { generateAccessCode } from '@/lib/events/actions';
// ...existing code...
import DeleteEventModal from '@/components/delete-event-modal';
import EventSettingsForm from '@/components/event-settings-form';
import AdminEventChat from '@/components/admin-event-chat';

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
  // Fetch timeline entries for this event
  const timelineItems = await getEventTimeline(eventId);
  const eventCode = event.eventCode;
  const photos = await getPhotosForEvent(eventId);
  const stats = await getEventStats(eventId);

  const eventDate = new Date(event.date);
  const photoCount = photos?.length || 0;
  const approvedCount = (photos as any[])?.filter((p) => p.isApproved)?.length || 0;
  // Use user's planName for limits and caps
  const planName = normalizePlanName(user?.planName ?? 'free');
  const planUploadLimit = uploadLimitBytes(planName);
  const planPhotoCap = photoLimitPerEvent(planName) ?? Number.MAX_SAFE_INTEGER;
  const usedPct = Math.min(100, Math.round((photoCount / planPhotoCap) * 100));
  const isEventOwner = user.id === event.createdBy.id || !!user.isOwner;

  async function saveEvent(formData: FormData) {
    'use server';
    const eventId = Number(formData.get('eventId'));
  const name = String(formData.get('name') ?? '').trim();
  const isPublic = !!formData.get('isPublic');
  const allowGuestUploads = !!formData.get('allowGuestUploads');
  const requireApproval = !!formData.get('requireApproval');
  const category = String(formData.get('category') ?? '').trim();

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
        category: category || existing.category,
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
    if (!ok) {
      return redirect(`/dashboard/events/${existing.eventCode}?error=${encodeURIComponent('Confirmation text incorrect')}`);
    }

    // Delete all photos for this event
    await db.delete(photosTable).where(eq(photosTable.eventId, eventId));
    // Delete the event itself
    await db.delete(eventsTable).where(eq(eventsTable.id, eventId));
    // Redirect to dashboard events
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
          {/* Timeline editor for event owner */}
          {isEventOwner && (
            <EventTimelineEditor
              eventId={eventId}
              entries={timelineItems.map((item) => ({
                ...item,
                description: item.description ?? '',
                location: item.location ?? '',
                time: typeof item.time === 'string' ? item.time : item.time.toISOString(),
              }))}
            />
          )}
          {/* Timeline component for all users */}
          <div className="mb-2">
            <Timeline items={timelineItems} storageKey={`tcg_timeline_collapsed:view:${eventId}`} canAdjust={isEventOwner} eventId={eventId} />
          </div>
          <div className="flex items-center gap-2 mb-6">
            <a href={`/api/events/${eventId}/ics`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-amber-300 bg-white text-amber-800 hover:bg-amber-50 text-sm">
              <CalendarIcon className="h-4 w-4" /> Subscribe (ICS)
            </a>
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
              <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm text-gray-700 items-center">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-orange-700">Host</span>
                    <Tooltip content="The event creator.">
                      <button
                        type="button"
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                        tabIndex={0}
                        aria-label="Host Info"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
                          <text x="10" y="15" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">?</text>
                        </svg>
                      </button>
                    </Tooltip>
                  </div>
                  <span className="font-mono font-medium mt-1 tracking-wide text-orange-900 bg-orange-50 px-2 py-1 rounded shadow-sm border border-orange-100">{event?.createdBy?.name || 'Unknown'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-orange-700">Date</span>
                    <Tooltip content="The scheduled date of the event.">
                      <button
                        type="button"
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                        tabIndex={0}
                        aria-label="Date Info"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
                          <text x="10" y="15" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">?</text>
                        </svg>
                      </button>
                    </Tooltip>
                  </div>
                  <span className="font-mono font-medium mt-1 tracking-wide text-orange-900 bg-orange-50 px-2 py-1 rounded shadow-sm border border-orange-100">{eventDate?.toLocaleDateString?.()}</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-orange-700 min-w-0 truncate text-center">Per Photo Limit</span>
                    <Tooltip content="Maximum file size allowed per upload.">
                      <button
                        type="button"
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                        tabIndex={0}
                        aria-label="Upload Limit Info"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
                          <text x="10" y="15" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">?</text>
                        </svg>
                      </button>
                    </Tooltip>
                  </div>
                  <span className="font-mono font-medium mt-1 tracking-wide text-orange-900 bg-orange-50 px-2 py-1 rounded shadow-sm border border-orange-100">{toMB(planUploadLimit)}</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-orange-700">Total Photos</span>
                    <Tooltip content="Total number of photos uploaded to this event.">
                      <button
                        type="button"
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                        tabIndex={0}
                        aria-label="Total Photos Info"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
                          <text x="10" y="15" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">?</text>
                        </svg>
                      </button>
                    </Tooltip>
                  </div>
                  <span className="font-mono font-medium mt-1 tracking-wide text-orange-900 bg-orange-50 px-2 py-1 rounded shadow-sm border border-orange-100">{photoCount}</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center gap-1 w-full">
                    <span className="font-semibold text-orange-700 min-w-0 truncate text-center hover:whitespace-normal hover:overflow-visible">Approved Photos</span>
                    <Tooltip content="Photos that have been approved and are visible to guests.">
                      <button
                        type="button"
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                        tabIndex={0}
                        aria-label="Approved Photos Info"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
                          <text x="10" y="15" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">?</text>
                        </svg>
                      </button>
                    </Tooltip>
                  </div>
                  <span className="font-mono font-medium mt-1 tracking-wide text-orange-900 bg-orange-50 px-2 py-1 rounded shadow-sm border border-orange-100">{approvedCount}</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-orange-700">Photos Cap</span>
                    <Tooltip content="Maximum number of photos allowed for this event.">
                      <button
                        type="button"
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                        tabIndex={0}
                        aria-label="Photo Cap Info"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
                          <text x="10" y="15" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">?</text>
                        </svg>
                      </button>
                    </Tooltip>
                  </div>
                  <span className="font-mono font-medium mt-1 tracking-wide text-orange-900 bg-orange-50 px-2 py-1 rounded shadow-sm border border-orange-100">{planPhotoCap}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-orange-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h2l2-3h10l2 3h2a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2zm9 4a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4z" />
                  </svg><div className="flex-1 h-2 rounded bg-gray-100 overflow-hidden">
                  <div className="h-2 bg-orange-500" style={{ width: `${usedPct}%` }} />
                </div>
                <span className="flex items-center gap-1 text-xs text-gray-700 font-medium">
                  
                  {photoCount} / {planPhotoCap} used
                </span>
              </div>
                            {isEventOwner && (
                <EventSettingsForm event={event} isEventOwner={isEventOwner} />
              )}
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
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-green-700">Event Code</span>
                    <span className="relative group">
                      <button
                        type="button"
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-green-100 hover:bg-green-200 text-green-700 border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                        tabIndex={0}
                        aria-label="Event Code Info"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
                          <text x="10" y="15" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">?</text>
                        </svg>
                      </button>
                      <span className="absolute left-1/2 -translate-x-1/2 mt-2 z-20 hidden group-hover:block group-focus-within:block bg-white text-green-900 text-xs rounded shadow-lg px-3 py-2 border border-green-200 whitespace-nowrap">
                        <span className="font-semibold">Event Code:</span> Unique identifier for this event.
                      </span>
                    </span>
                  </div>
                  <span className="font-mono font-medium mt-1 tracking-wide text-green-900 bg-green-50 px-2 py-1 rounded shadow-sm border border-green-100">{event?.eventCode}</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-green-700">Public Event</span>
                    <span className="relative group">
                      <button
                        type="button"
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-green-100 hover:bg-green-200 text-green-700 border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                        tabIndex={0}
                        aria-label="Public Event Info"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
                          <text x="10" y="15" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">?</text>
                        </svg>
                      </button>
                      <span className="absolute left-1/2 -translate-x-1/2 mt-2 z-20 hidden group-hover:block group-focus-within:block bg-white text-green-900 text-xs rounded shadow-lg px-3 py-2 border border-green-200 whitespace-nowrap">
                        <span className="font-semibold">Public Event:</span> Anyone with the link can view and upload.
                      </span>
                    </span>
                  </div>
                  <span className="font-medium mt-1 tracking-wide text-green-900 bg-green-50 px-2 py-1 rounded shadow-sm border border-green-100">{event?.isPublic ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-red-700">Access Code</span>
                    <Tooltip content={<span><span className="font-semibold">Private Event:</span> Access is required via Access Code.</span>} side="bottom" align="start" className="max-w-xs whitespace-normal">
                      <button
                        type="button"
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
                        tabIndex={0}
                        aria-label="Access Code Info"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
                          <text x="10" y="15" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">?</text>
                        </svg>
                      </button>
                    </Tooltip>
                  </div>
                  <span className="font-mono font-medium mt-1 tracking-wide text-red-900 bg-green-50 px-2 py-1 rounded shadow-sm border border-red-100">{event?.accessCode}</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center gap-2 w-full">
                    <span className="font-semibold text-green-700 min-w-0 truncate text-center hover:whitespace-normal hover:overflow-visible">Guest Uploads</span>
                    <span className="relative group">
                      <button
                        type="button"
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-green-100 hover:bg-green-200 text-green-700 border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                        tabIndex={0}
                        aria-label="Guest Uploads Info"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
                          <text x="10" y="15" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">?</text>
                        </svg>
                      </button>
                      <span className="absolute left-1/2 -translate-x-1/2 mt-2 z-20 hidden group-hover:block group-focus-within:block bg-white text-green-900 text-xs rounded shadow-lg px-3 py-2 border border-green-200 whitespace-nowrap">
                        <span className="font-semibold">Guest Uploads:</span> Allow non-owners to upload photos.
                      </span>
                    </span>
                  </div>
                  <span className="font-medium mt-1 tracking-wide text-green-900 bg-green-50 px-2 py-1 rounded shadow-sm border border-green-100">{event?.allowGuestUploads ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center gap-2 w-full">
                    <span className="font-semibold text-green-700 min-w-0 truncate text-center hover:whitespace-normal hover:overflow-visible">Photo Approval?</span>
                    <span className="relative group">
                      <button
                        type="button"
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-green-100 hover:bg-green-200 text-green-700 border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                        tabIndex={0}
                        aria-label="Photo Approval Info"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
                          <text x="10" y="15" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">?</text>
                        </svg>
                      </button>
                      <span className="absolute left-1/2 -translate-x-1/2 mt-2 z-20 hidden group-hover:block group-focus-within:block bg-white text-green-900 text-xs rounded shadow-lg px-3 py-2 border border-green-200 whitespace-nowrap">
                        <span className="font-semibold">Photo Approval:</span> Owner must approve photos before they appear.
                      </span>
                    </span>
                  </div>
                  <span className="font-medium mt-1 tracking-wide text-green-900 bg-green-50 px-2 py-1 rounded shadow-sm border border-green-100">{event?.requireApproval ? 'Yes' : 'No'}</span>
                </div>
                
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Link href={`/events/${eventCode}`} target="_blank">
                  <Button size="sm" className="px-3 py-1.5 text-sm">View Guest Page</Button>
                </Link>
                <RegenerateCodeButton eventId={eventId} eventName={event?.name} category={event?.category} accessCode={event?.accessCode} />
              </div>

              <div className="mt-4">
                <div className="space-y-3">
                  <span className="flex items-center gap-2 font-bold text-2xl text-green-900">
                    <span className="bg-green-100 rounded-full p-2">
                      <QrCode className="w-6 h-6 text-green-600" />
                    </span>
                    Guest QR Code
                  </span>
                  <EventQr code={eventCode} size={160} compact />
                </div>
              </div>
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
              <div className="min-w-0 w-full sm:w-auto sm:min-w-[220px]">
                <BulkDownload photos={(photos as any[])?.filter((p) => p.isApproved) || []} compact fullWidth />
              </div>
            </div>
            <PhotoGallery
              photos={(photos as any[])?.filter((p) => p.isApproved) || []}
              eventId={eventId}
              currentUserId={user?.id}
              canManage={true}
            />
          </div>

          {/* Host Chat Moderation */}
          {isEventOwner && event?.chatEnabled !== false && (
            <div className="mb-6">
              <AdminEventChat eventId={eventId} />
            </div>
          )}

          {/* Danger Zone */}
          {isEventOwner && (
            <div className="pt-6 mt-2 border-t">
              <p className="text-sm font-medium text-red-600 mb-2">Danger Zone</p>
              <div className="text-xs text-gray-600 mb-3">
                Deleting this event will permanently remove all photos and cannot be undone.
              </div>
              <DeleteEventModal eventId={eventId} eventName={event?.name} eventCode={event?.eventCode} accessCode={event?.accessCode} action={deleteEventAction as any} />
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
