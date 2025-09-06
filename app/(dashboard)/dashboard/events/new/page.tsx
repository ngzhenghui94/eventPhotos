'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Calendar, MapPin, FileText, Settings } from 'lucide-react';
import Link from 'next/link';
import { createEventAction } from '../actions';
import UpdateToast from '@/components/update-toast';
import useSWR from 'swr';
import { Suspense } from 'react';

const NewEventPage = () => {
  const { data: dashboardInfo } = useSWR('/api/dashboard-info', (url) => fetch(url).then(res => res.json()), {
    dedupingInterval: 60000,
    revalidateOnFocus: false,
  });
  const { data: events } = useSWR('/api/events', (url) => fetch(url).then(res => res.json()));

  const eventLimit = dashboardInfo?.eventLimit;
  const eventCount = events?.length ?? 0;
  const eventLimitReached = eventLimit !== null && typeof eventLimit === 'number' && eventCount >= eventLimit;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <section className="flex-1 p-4 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <UpdateToast />
        <div className="flex items-center mb-6">
          <Link href="/dashboard/events">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Events
            </Button>
          </Link>
          <div>
            <h1 className="text-lg lg:text-2xl font-medium text-gray-900">Create New Event</h1>
            <p className="text-sm text-gray-600 mt-1">Set up a new photo sharing event for your guests</p>
          </div>
        </div>

        {eventLimitReached && (
          <div className="mb-6">
            <Card className="border-2 border-red-300 bg-gradient-to-br from-red-50 via-white to-red-100 shadow-xl animate-in fade-in duration-500">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <Calendar className="h-7 w-7 text-red-500 animate-pulse" />
                </div>
                <CardTitle className="text-red-700 text-lg font-bold">Event Limit Reached</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-red-800 text-base font-semibold mb-2">You’ve hit the maximum number of events for your current plan.</div>
                <div className="flex gap-6 text-sm mb-2">
                  <div>
                    <span className="font-medium">Current Events:</span> {eventCount}
                  </div>
                  <div>
                    <span className="font-medium">Event Limit:</span> {eventLimit === null ? 'Unlimited' : eventLimit}
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-700">Upgrade your plan to unlock more events and features.</div>
                <div className="mt-4 flex gap-3">
                  <Link href="/dashboard/upgrade">
                    <Button className="bg-gradient-to-r from-red-500 to-amber-400 text-white font-semibold shadow-lg hover:scale-105 transition-transform rounded-full px-6 py-2">
                      Upgrade Plan
                    </Button>
                  </Link>
                  <Link href="/dashboard/events">
                    <Button variant="outline" className="rounded-full px-6 py-2">Back to Events</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <form action={createEventAction} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Event Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter event name"
                  required
                  className="mt-1"
                  disabled={eventLimitReached}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe your event (optional)"
                  rows={3}
                  className="mt-1"
                  disabled={eventLimitReached}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Event Date *</Label>
                  <Input
                    id="date"
                    name="date"
                    type="datetime-local"
                    required
                    className="mt-1"
                    disabled={eventLimitReached}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder="Event location (optional)"
                    className="mt-1"
                    disabled={eventLimitReached}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="isPublic" name="isPublic" disabled={eventLimitReached} />
                <Label htmlFor="isPublic" className="text-sm font-normal">
                  Make event publicly discoverable
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="allowGuestUploads" name="allowGuestUploads" defaultChecked disabled={eventLimitReached} />
                <Label htmlFor="allowGuestUploads" className="text-sm font-normal">
                  Allow guests to upload photos
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="requireApproval" name="requireApproval" disabled={eventLimitReached} />
                <Label htmlFor="requireApproval" className="text-sm font-normal">
                  Require approval before photos are visible
                </Label>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> After creating the event, you'll receive a unique access code
                  that guests can use to access the event and upload photos.
                </p>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end space-x-3">
            <Link href="/dashboard/events">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={eventLimitReached}>
              Create Event
            </Button>
          </div>
        </form>
      </div>
    </section>
    </Suspense>
  );
};

export default NewEventPage;
