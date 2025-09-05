"use client";

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import useSWR from 'swr';
import { Suspense } from 'react';
import {
  Calendar,
  MapPin,
  Camera,
  Users,
  Eye,
  EyeOff,
  Upload,
  ExternalLink,
  Plus,
  Clock,
  Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';

interface EventWithPhotoCount {
  id: number;
  eventCode: string;
  name: string;
  description?: string;
  date: Date;
  location?: string;
  isPublic: boolean;
  allowGuestUploads: boolean;
  requireApproval: boolean;
  createdAt: Date;
  ownerName?: string;
  ownerId: number;
  photoCount: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function EventsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="h-[280px] animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EventCard({ event }: { event: EventWithPhotoCount }) {
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-orange-300 bg-white flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
              {event.name}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Created {formatTime(event.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {event.isPublic ? (
              <span title="Public event">
                <Eye className="h-4 w-4 text-green-500" />
              </span>
            ) : (
              <span title="Private event">
                <EyeOff className="h-4 w-4 text-gray-400" />
              </span>
            )}
            {event.allowGuestUploads && (
              <span title="Guest uploads allowed">
                <Upload className="h-4 w-4 text-blue-500" />
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4 flex-1">
        <div className="space-y-3 h-full flex flex-col">
          {/* Event Details */}
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="mr-1 h-4 w-4 flex-shrink-0" />
              <span>{formatDate(event.date)}</span>
            </div>
            {event.location && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="mr-1 h-4 w-4 flex-shrink-0" />
                <span>{event.location}</span>
              </div>
            )}
            <div className="flex items-center text-sm text-gray-600">
              <ImageIcon className="mr-1 h-4 w-4 flex-shrink-0" />
              <span>{event.photoCount} photo{event.photoCount === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2 flex items-center justify-between">
        <Link href={`/dashboard/events/${event.eventCode}`} className="text-orange-600 hover:underline text-sm font-medium flex items-center gap-1">
          View Event
          <ExternalLink className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500">{event.ownerName || '—'}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

function EventsList() {
  const { data: events, error, isLoading } = useSWR<EventWithPhotoCount[]>('/api/events', fetcher);

  if (error) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load events</h3>
          <p className="text-gray-600 mb-4">There was an error loading your events.</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <EventsSkeleton />;
  }

  if (!events || events.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
          <p className="text-gray-600 mb-4">Create your first event to start collecting and sharing photos.</p>
          <Link href="/dashboard/events/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Event
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

export default function EventsPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-2">Events</h1>
          <p className="text-sm text-gray-600">Manage your photo sharing events</p>
        </div>
        <Link href="/dashboard/events/new">
          <Button className="mt-4 lg:mt-0">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>
      <EventsList />
    </section>
  );
}