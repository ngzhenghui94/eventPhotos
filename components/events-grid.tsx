"use client";
import { useMemo, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, ChevronDown, ChevronUp, Users, Settings, Eye, ExternalLink } from 'lucide-react';
import { CategoryIcon } from '@/components/category-icon';

type EventItem = import('@/lib/db/schema').Event & { photoCount: number; ownerName?: string | null; category?: string };

function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatCreated(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function EventsGrid({ items }: { items: EventItem[] }) {
  const [dir, setDir] = useState<'desc' | 'asc'>('desc');

  const sorted = useMemo(() => {
    const list = [...(items || [])];
    list.sort((a, b) => {
      const aDate = a?.date ? new Date(a.date as any).getTime() : (a?.createdAt ? new Date(a.createdAt as any).getTime() : 0);
      const bDate = b?.date ? new Date(b.date as any).getTime() : (b?.createdAt ? new Date(b.createdAt as any).getTime() : 0);
      return dir === 'desc' ? bDate - aDate : aDate - bDate;
    });
    return list;
  }, [items, dir]);

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button variant="outline" size="sm" onClick={() => setDir(d => (d === 'desc' ? 'asc' : 'desc'))}>
          Sort by date {dir === 'desc' ? (
            <span className="inline-flex items-center ml-2 text-gray-600">Newest <ChevronDown className="h-4 w-4 ml-1" /></span>
          ) : (
            <span className="inline-flex items-center ml-2 text-gray-600">Oldest <ChevronUp className="h-4 w-4 ml-1" /></span>
          )}
        </Button>
      </div>
      {sorted.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((event) => {
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
            let hash = 0;
            for (let i = 0; i < event.eventCode.length; i++) hash = (hash * 31 + event.eventCode.charCodeAt(i)) % gradients.length;
            const gradient = gradients[Math.abs(hash) % gradients.length];
            const isDemo = (event.name || '').toLowerCase() === 'demo event' || (event.eventCode || '').toUpperCase().includes('DEMO');
            const cardGradient = isDemo ? 'from-orange-50 via-white to-blue-100' : gradient;
            const borderClass = isDemo ? 'border-orange-200' : 'border-gray-200';
            return (
              <Card key={event.id} className={`border ${borderClass} shadow-sm hover:shadow-md transition-shadow flex flex-col h-full bg-gradient-to-br ${cardGradient} rounded-xl`}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-2">
                    <CardTitle className="text-base font-semibold text-gray-900 truncate flex items-center gap-2">
                      <CategoryIcon category={event.category} />
                      {event.name || 'Untitled Event'}
                      {event.category && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">{event.category}</span>
                      )}
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
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0"><path d="M21 10c0 6.075-9 13-9 13S3 16.075 3 10a9 9 0 1 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
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
                      <Button size="xs" variant="secondary" className="w-full flex items-center gap-1">
                        <Settings className="h-4 w-4" />
                        Manage
                      </Button>
                    </Link>
                    <Link href={`/gallery/${event.id}`} className="flex-1">
                      <Button size="xs" variant="outline" className="w-full flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    <Link href={`/events/${event.eventCode}`} className="flex-1">
                      <Button size="xs" variant="outline" className="w-full flex items-center gap-1">
                        <ExternalLink className="h-4 w-4" />
                        Guest Page
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-gray-500">No events.</div>
      )}
    </div>
  );
}

// Category icon mapping moved to shared component `CategoryIcon`
