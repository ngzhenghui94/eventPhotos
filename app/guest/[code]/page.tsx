import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Upload, Camera } from 'lucide-react';
import { getEventByAccessCode, getPhotosForEvent } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { GuestPhotoUpload } from '@/components/guest-photo-upload';
import { PhotoGallery } from '@/components/photo-gallery';

interface GuestEventPageProps {
  params: Promise<{ code: string }>;
}

export default async function GuestEventPage({ params }: GuestEventPageProps) {
  const { code } = await params;
  
  const event = await getEventByAccessCode(code.toUpperCase());
  
  if (!event) {
    redirect('/guest/not-found');
  }

  const photos = await getPhotosForEvent(event.id, false); // Only approved photos for guests
  const eventDate = new Date(event.date);
  const photoCount = photos?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 rounded-full p-3">
              <Camera className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <Calendar className="mr-1 h-4 w-4" />
                {eventDate.toLocaleDateString()}
                {event.location && (
                  <>
                    <span className="mx-2">•</span>
                    <MapPin className="mr-1 h-4 w-4" />
                    {event.location}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-8">
            {/* Event Description */}
            {event.description && (
              <Card>
                <CardHeader>
                  <CardTitle>About This Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{event.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Photo Upload for Guests */}
            {event.allowGuestUploads && (
              <GuestPhotoUpload eventId={event.id} />
            )}

            {/* Photo Gallery */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Event Photos ({photoCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoGallery
                  photos={photos || []}
                  eventId={event.id}
                  canManage={false} // Guests cannot manage photos
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="bg-gray-100 rounded-lg p-4 mb-4">
                    <p className="text-xs text-gray-500 mb-1">Event Code</p>
                    <p className="font-mono text-lg font-bold text-gray-900">
                      {event.accessCode}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Share this code with other guests so they can access this event
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

            <Card>
              <CardHeader>
                <CardTitle>How to Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                    <Upload className="h-4 w-4 text-blue-600" />
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
          </div>
        </div>
      </div>
    </div>
  );
}