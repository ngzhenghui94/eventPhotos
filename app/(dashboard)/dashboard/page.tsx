'use client';

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
            <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
              <span className="block truncate">
                {event.name}
              </span>
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
              <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
              {formatDate(event.date)}
            </div>
            {event.location && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="truncate" title={event.location}>{event.location}</span>
              </div>
            )}
            {event.ownerName && (
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="truncate">by {event.ownerName}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="text-sm text-gray-600 flex-1">
              <span className="block overflow-hidden" style={{ 
                display: '-webkit-box', 
                WebkitLineClamp: 2, 
                WebkitBoxOrient: 'vertical' 
              }}>
                {event.description}
              </span>
            </div>
          )}

          {/* Photo Count */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
            <div className="flex items-center text-sm">
              <ImageIcon className="h-4 w-4 mr-1 text-gray-400" />
              <span className="font-medium text-gray-700">
                {event.photoCount} photo{event.photoCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              #{event.eventCode}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex gap-2">
        <Button 
          asChild 
          size="sm" 
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Link href={`/dashboard/events/${event.id}`} className="flex items-center gap-1">
            <Camera className="h-4 w-4" />
            Manage
          </Link>
        </Button>
        <Button 
          asChild 
          variant="outline" 
          size="sm"
          className="border-gray-300 hover:bg-gray-50"
        >
          <Link href={`/gallery/${event.id}`} className="flex items-center gap-1">
            <ExternalLink className="h-4 w-4" />
            View
          </Link>
        </Button>
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
          <p className="text-gray-600 mb-6">Create your first event to start collecting and sharing photos.</p>
          <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
            <Link href="/dashboard/events/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Event
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-orange-500 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-900">Total Events</p>
                <p className="text-2xl font-bold text-orange-800">{events.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-blue-500 p-2 rounded-lg">
                <ImageIcon className="h-5 w-5 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-900">Total Photos</p>
                <p className="text-2xl font-bold text-blue-800">
                  {events.reduce((total, event) => total + event.photoCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-green-500 p-2 rounded-lg">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-900">Public Events</p>
                <p className="text-2xl font-bold text-green-800">
                  {events.filter(event => event.isPublic).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <section className="flex-1 p-4 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Events Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your photo events and galleries</p>
          </div>
          <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg">
            <Link href="/dashboard/events/new" className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New Event
            </Link>
          </Button>
        </div>

        {/* Events List */}
        <Suspense fallback={<EventsSkeleton />}>
          <EventsList />
        </Suspense>
      </div>
    </section>
  );
}
