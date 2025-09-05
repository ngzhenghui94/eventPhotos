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
import { EventCard, EventWithPhotoCount } from '@/components/event-card';
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

// ...EventWithPhotoCount is now imported from components/event-card.tsx

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

// ...EventCard is now imported from components/event-card.tsx

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

