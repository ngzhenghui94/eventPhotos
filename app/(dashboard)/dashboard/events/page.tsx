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