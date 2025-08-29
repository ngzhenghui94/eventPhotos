import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { getEventById, getPhotosForEvent, getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { PhotoUpload } from '@/components/photo-upload';
import { PhotoGallery } from '@/components/photo-gallery';

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
    getPhotosForEvent(eventId, true), // Include unapproved for event owners
    getUser()
  ]);
  
  if (!event || !user) {
    redirect('/dashboard/events');
  }

  const eventDate = new Date(event.date);
  const photoCount = photos?.length || 0;

  return (
    <section className="flex-1 p-4 lg:p-8">
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
            <PhotoUpload eventId={eventId} />

            {/* Photo Gallery */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Photos ({photoCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoGallery
                  photos={photos || []}
                  eventId={eventId}
                  currentUserId={user.id}
                  canManage={true} // Event owners can manage all photos
                />
              </CardContent>
            </Card>
          </div>

          {/* Event Settings Sidebar */}
          <div>
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
                    <Button className="w-full" size="sm">
                      View Guest Page
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}