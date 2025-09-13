"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Calendar, Eye, Plus, ExternalLink, ImageIcon } from 'lucide-react';
import { EventsGrid } from '@/components/events-grid';
import UpdateToast from '@/components/update-toast';
import type { EventWithPhotoCount } from '@/lib/types/common';

// Simple fetcher for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());
export default function DashboardPage() {
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
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
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading events...</h3>
        </CardContent>
      </Card>
    );
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

  // Sort events
  const sortedEvents = [...events].sort((a, b) => {
    const aDate = a?.date ? new Date(a.date as any).getTime() : (a?.createdAt ? new Date(a.createdAt as any).getTime() : 0);
    const bDate = b?.date ? new Date(b.date as any).getTime() : (b?.createdAt ? new Date(b.createdAt as any).getTime() : 0);
    return sortDir === 'desc' ? bDate - aDate : aDate - bDate;
  });

  return (
    <section className="flex-1 min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <UpdateToast />
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
                The Crowd Grid
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
              <div className="w-32 h-32 rounded-full shadow-lg border-4 border-orange-200 bg-white flex items-center justify-center">
                <svg width="64" height="64" viewBox="0 0 256 256" aria-hidden>
                  <defs>
                    <linearGradient id="tcg-hero" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fb923c" />
                    </linearGradient>
                  </defs>
                  <rect width="256" height="256" rx="48" fill="url(#tcg-hero)" />
                  <g fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
                    <path d="M48 64h160M48 128h160M48 192h160" />
                    <path d="M64 48v160M128 48v160M192 48v160" />
                  </g>
                  <circle cx="196" cy="60" r="14" fill="#fff" opacity="0.95" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Events List & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="bg-orange-500 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-orange-900">Your Total Grids</p>
                  <p className="text-2xl font-bold text-orange-800">{events ? events.length : 0}</p>
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
                  <p className="text-sm font-medium text-blue-900">Your Total Photos</p>
                  <p className="text-2xl font-bold text-blue-800">{events ? events.reduce((total, e) => total + (e.photoCount ?? 0), 0) : 0}</p>
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
                  <p className="text-sm font-medium text-green-900">Your Public Grids</p>
                  <p className="text-2xl font-bold text-green-800">{events ? events.filter(event => event.isPublic).length : 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Events Grid with sorting */}
        {sortedEvents.length > 0 ? (
          <EventsGrid items={sortedEvents as any} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center text-center py-12">
              <Camera className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No events yet</h3>
              <p className="text-sm text-gray-500 max-w-sm mb-6">Create your first event to start collecting and sharing photos.</p>
              <Link href="/dashboard/events/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Event
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
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
