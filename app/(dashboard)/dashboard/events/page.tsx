'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, Users, Camera, Plus, Eye } from 'lucide-react';
import { CreateEventModal } from '@/components/create-event-modal';
import { EventGallery } from '@/components/event-gallery';

interface Event {
  id: number;
  name: string;
  description?: string;
  eventDate?: string;
  location?: string;
  isPublic: boolean;
  allowGuestUploads: boolean;
  createdAt: string;
  ownerName?: string;
  ownerId: number;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const handleEventCreated = (newEvent: Event) => {
    setEvents(prev => [newEvent, ...prev]);
    setShowCreateModal(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (selectedEvent) {
    return (
      <EventGallery 
        event={selectedEvent} 
        onBack={() => setSelectedEvent(null)} 
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Events</h1>
          <p className="text-gray-600 mt-1">Create and manage photo galleries for your events</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="text-center py-12">
          <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
          <p className="text-gray-600 mb-6">Create your first event to start sharing photos</p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2"
          >
            Create Your First Event
          </Button>
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                    {event.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    {event.isPublic && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Public
                      </span>
                    )}
                    {event.allowGuestUploads && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        Guest uploads
                      </span>
                    )}
                  </div>
                </div>
                {event.description && (
                  <CardDescription className="text-gray-600 line-clamp-2">
                    {event.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {formatDate(event.eventDate)}
                </div>
                {event.location && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    {event.location}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2 text-gray-400" />
                  Created by {event.ownerName || 'Unknown'}
                </div>
                <div className="pt-3">
                  <Button
                    onClick={() => setSelectedEvent(event)}
                    variant="outline"
                    className="w-full rounded-full hover:bg-orange-50 hover:border-orange-300 transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Gallery
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onEventCreated={handleEventCreated}
      />
    </div>
=======
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, MapPin, Users, Settings, ExternalLink } from 'lucide-react';
import { getTeamForUser, getEventsForTeam } from '@/lib/db/queries';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function EventsPage() {
  const team = await getTeamForUser();
  
  if (!team) {
    redirect('/sign-in');
  }

  const events = await getEventsForTeam(team.id);

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-2">
            Events
          </h1>
          <p className="text-sm text-gray-600">
            Manage your photo sharing events and view guest uploads
          </p>
        </div>
        <Link href="/dashboard/events/new">
          <Button className="mt-4 lg:mt-0">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {events.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No events yet
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mb-6">
              Create your first event to start collecting and sharing photos with guests.
            </p>
            <Link href="/dashboard/events/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Event
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function EventCard({ event }: { event: any }) {
  const eventDate = new Date(event.date);
  const photoCount = event.photos?.length || 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{event.name}</CardTitle>
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <Calendar className="mr-1 h-3 w-3" />
              {eventDate.toLocaleDateString()}
            </div>
            {event.location && (
              <div className="flex items-center text-sm text-gray-500">
                <MapPin className="mr-1 h-3 w-3" />
                {event.location}
              </div>
            )}
          </div>
          <div className="flex space-x-1">
            <Link href={`/dashboard/events/${event.id}`}>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/guest/${event.accessCode}`} target="_blank">
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {event.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {event.description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-500">
            <Users className="mr-1 h-3 w-3" />
            {photoCount} photos
          </div>
          <div className="flex items-center space-x-2">
            {event.isPublic && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                Public
              </span>
            )}
            {event.allowGuestUploads && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                Guest Uploads
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-gray-500">
            Access Code: <span className="font-mono font-semibold">{event.accessCode}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}