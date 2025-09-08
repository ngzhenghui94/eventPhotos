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
import { getCategoryIcon } from '@/components/events-grid';
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
  category?: string;
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

  // Deterministic gradient based on eventCode
  const gradients = [
    'from-orange-50 to-blue-100',
    'from-pink-50 to-yellow-100',
    'from-green-50 to-blue-50',
    'from-purple-50 to-orange-50',
    'from-amber-50 to-lime-100',
    'from-cyan-50 to-indigo-100',
    'from-red-50 to-pink-100',
    'from-teal-50 to-green-100',
    'from-gray-50 to-gray-100',
  ];
  function pickGradient(code: string) {
    let hash = 0;
    for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) % gradients.length;
    return gradients[Math.abs(hash) % gradients.length];
  }
  const gradient = pickGradient(event.eventCode || '');
  return (
    <Card className={`border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full bg-gradient-to-br ${gradient}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2">
          <CardTitle className="text-base font-semibold text-gray-900 truncate flex items-center gap-2">
            {getCategoryIcon(event.category)}
            {event.name || 'Untitled Event'}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full border ${event.isPublic ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {event.isPublic ? 'Public' : 'Private'}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
              Code: {event.eventCode}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 border-gray-200">
              {formatDate(event.date)}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 text-xs font-medium border border-pink-200 ml-auto" title="Total Photos">
              {event.photoCount} photo{event.photoCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 justify-between pt-0">
        <div className="text-xs text-gray-600 mb-3">
          {event.ownerName && (
            <>Owner: <span className="font-medium text-gray-800">{event.ownerName}</span></>
          )}
        </div>
        {event.location && (
          <div className="flex items-center text-xs text-gray-600 mb-2">
            <MapPin className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0" />
            <span className="truncate" title={event.location}>{event.location}</span>
          </div>
        )}
        {event.description && (
          <div className="text-xs text-gray-600 mb-2">
            <p className="line-clamp-2">{event.description}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-4">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200">Access: {event.isPublic ? 'Public' : 'Private'}</span>
        </div>
        <div className="flex items-center gap-2 mt-auto pt-2">
          <Link href={`/dashboard/events/${event.id}`} className="flex-1">
            <Button size="sm" variant="secondary" className="w-full flex items-center gap-1">
              <Camera className="h-4 w-4" /> Manage
            </Button>
          </Link>
          <Link href={`/gallery/${event.id}`} className="flex-1">
            <Button size="sm" variant="outline" className="w-full flex items-center gap-1">
              <ExternalLink className="h-4 w-4" /> View
            </Button>
          </Link>
        </div>
      </CardContent>
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


function DashboardPage() {
  return (
    <section className="flex-1 min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Hero Section */}
        <div className="relative rounded-xl overflow-hidden mb-10 shadow-lg bg-gradient-to-r from-orange-100 via-white to-blue-100 border border-orange-200 animate-fade-in">
          <div className="absolute inset-0 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 600 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="60" r="80" fill="#FFEDD5" opacity="0.3" />
              <circle cx="500" cy="60" r="80" fill="#DBEAFE" opacity="0.3" />
            </svg>
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between px-8 py-10 gap-6">
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-extrabold text-orange-900 mb-2 flex items-center gap-2">
                <Camera className="h-8 w-8 text-orange-500 animate-bounce" />
                Memories Vault
              </h1>
              <p className="text-lg text-gray-700 mb-4">Capture, share, and relive your event memories in one beautiful dashboard.</p>
              <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg text-base px-6 py-3">
                <Link href="/dashboard/events/new" className="flex items-center gap-2">
                  <Plus className="h-4 w-5" />
                  Create New Event
                </Link>
              </Button>
            </div>
            <div className="flex-shrink-0 hidden md:block">
              <img src="/favicon.ico" alt="Memories Vault" className="w-32 h-32 rounded-full shadow-lg border-4 border-orange-200" />
            </div>
          </div>
        </div>

        {/* Events List & Stats */}
        <Suspense fallback={<EventsSkeleton />}>
          <EventsList />
        </Suspense>
      </div>
      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 1s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}


export default DashboardPage;
