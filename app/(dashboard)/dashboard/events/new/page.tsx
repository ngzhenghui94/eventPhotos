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
const NewEventPage = () => {
  const { data: dashboardInfo } = useSWR('/api/dashboard-info', (url) => fetch(url).then(res => res.json()), {
    dedupingInterval: 60000,
    revalidateOnFocus: false,
  });
  const { data: events } = useSWR('/api/events', (url) => fetch(url).then(res => res.json()));

  const eventLimit = dashboardInfo?.team?.eventLimit;
  const eventCount = events?.length ?? 0;
  const eventLimitReached = eventLimit !== null && typeof eventLimit === 'number' && eventCount >= eventLimit;

  return (
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 font-semibold mb-2">
              You have reached your event limit for your current plan.
            </p>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-medium">Current Events:</span> {eventCount}
              </div>
              <div>
                <span className="font-medium">Event Limit:</span> {eventLimit === null ? 'Unlimited' : eventLimit}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-700">Upgrade your plan to create more events.</p>
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
  );
};

export default NewEventPage;
