"use client";
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { EventCard } from '@/components/event-card';

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
            <EventCard key={event.id} event={event as any} />
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500">No events.</div>
      )}
    </div>
  );
}

// Category icon mapping moved to shared component `CategoryIcon`
