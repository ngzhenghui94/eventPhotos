"use client";
import { useMemo, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, ChevronDown, ChevronUp, Users } from 'lucide-react';

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
          {sorted.map((event) => (
            <Card key={event.id} className="group hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-orange-300 bg-white flex flex-col h-full">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors truncate flex items-center gap-2">
                        {getCategoryIcon(event.category)}
                        {event.name}
                        <span style={{fontSize:12, color:'#888'}}>({String(event.category)})</span>
                      </CardTitle>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Created {formatCreated(event.createdAt as any)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {event.isPublic ? (
                      <span title="Public event">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="8"></line></svg>
                      </span>
                    ) : (
                      <span title="Private event">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4 flex-1">
                <div className="space-y-3 h-full flex flex-col">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                      {event.date ? formatDate(event.date as any) : 'No date set'}
                    </div>
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0"><path d="M21 10c0 6.075-9 13-9 13S3 16.075 3 10a9 9 0 1 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span className="truncate" title={event.location as any}>{event.location}</span>
                      </div>
                    )}
                    {event.ownerName && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span className="truncate">by {event.ownerName}</span>
                      </div>
                    )}
                  </div>
                  {event.description && (
                    <div className="text-sm text-gray-600 flex-1">
                      <p className="line-clamp-2">{event.description}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
                    <div className="flex items-center text-sm">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1 text-gray-400"><circle cx="12" cy="12" r="3"></circle><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect></svg>
                      <span className="font-medium text-gray-700">{event.photoCount ?? 0} photo{(event.photoCount ?? 0) !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">#{event.eventCode}</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex gap-2">
                <Button asChild size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                  <Link href={`/dashboard/events/${event.id}`} className="flex items-center gap-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="3"></circle><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect></svg>
                    Manage
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="border-gray-300 hover:bg-gray-50">
                  <Link href={`/gallery/${event.id}`} className="flex items-center gap-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="3"></circle><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect></svg>
                    View
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500">No events.</div>
      )}
    </div>
  );
}

// Category icon mapping
// ...existing code...
// Category icon mapping
export function getCategoryIcon(category: string) {
  switch (category) {
    case 'Wedding':
      return (<svg className="h-4 w-4 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M2 20c0-4 8-4 8-4s8 0 8 4" /></svg>);
    case 'Birthday':
      return (<svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="8" rx="2" /><path d="M12 2v6" /><path d="M8 2v6" /><path d="M16 2v6" /></svg>);
    case 'Party':
      return (<svg className="h-4 w-4 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l1.5 4.5L18 7l-3.5 2.5L15 14l-3-2-3 2 1.5-4.5L6 7l4.5-0.5L12 2z" /></svg>);
    case 'Travel':
      return (<svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8" /><rect x="7" y="16" width="10" height="2" rx="1" /></svg>);
    case 'Event':
      return (<svg className="h-4 w-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /></svg>);
    case 'Conference':
      return (<svg className="h-4 w-4 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" /><path d="M16 2v5" /><path d="M8 2v5" /></svg>);
    case 'Reunion':
      return (<svg className="h-4 w-4 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /></svg>);
    case 'Festival':
      return (<svg className="h-4 w-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" /><path d="M12 2v5" /></svg>);
    case 'Corporate':
      return (<svg className="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 2v5" /><path d="M16 2v5" /></svg>);
    case 'Sports':
      return (<svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>);
    case 'Holiday':
      return (<svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M12 2v5" /></svg>);
    case 'Other':
      return (<svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>);
    default:
      return (<svg className="h-4 w-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>);
  }
}
