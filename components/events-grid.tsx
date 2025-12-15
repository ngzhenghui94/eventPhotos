"use client";
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { EventCard } from '@/components/event-card';

type EventItem = import('@/lib/db/schema').Event & {
  photoCount: number;
  ownerName?: string | null;
  category?: string;
  role?: 'host' | 'organizer' | 'photographer' | 'customer' | null;
};

function formatDate(date: Date | string | null | undefined) {
  if (!date) return 'No date';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatCreated(date: Date | string | null | undefined) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function EventsGrid({ items }: { items: EventItem[] }) {
  const [dir, setDir] = useState<'desc' | 'asc'>('desc');
  const [roleFilter, setRoleFilter] = useState<'all' | 'host' | 'organizer' | 'photographer' | 'customer'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'role'>('date');

  const filtered = useMemo(() => {
    if (roleFilter === 'all') return items || [];
    return (items || []).filter(e => (e as any).role === roleFilter);
  }, [items, roleFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortBy === 'date') {
      list.sort((a, b) => {
        const aDate = a?.date ? new Date(a.date as any).getTime() : (a?.createdAt ? new Date(a.createdAt as any).getTime() : 0);
        const bDate = b?.date ? new Date(b.date as any).getTime() : (b?.createdAt ? new Date(b.createdAt as any).getTime() : 0);
        return dir === 'desc' ? bDate - aDate : aDate - bDate;
      });
    } else {
      const order = ['host','organizer','photographer','customer'];
      list.sort((a, b) => {
        const ai = order.indexOf(((a as any).role) || 'zz');
        const bi = order.indexOf(((b as any).role) || 'zz');
        return ai - bi;
      });
    }
    return list;
  }, [filtered, dir, sortBy]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Filter:</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
          >
            <option value="all">All roles</option>
            <option value="host">Host</option>
            <option value="organizer">Organizer</option>
            <option value="photographer">Photographer</option>
            <option value="customer">Customer</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Sort by:</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="date">Date</option>
            <option value="role">Role</option>
          </select>
          {sortBy === 'date' && (
            <Button variant="outline" size="sm" onClick={() => setDir(d => (d === 'desc' ? 'asc' : 'desc'))}>
              Sort by date {dir === 'desc' ? (
                <span className="inline-flex items-center ml-2 text-gray-600">Newest <ChevronDown className="h-4 w-4 ml-1" /></span>
              ) : (
                <span className="inline-flex items-center ml-2 text-gray-600">Oldest <ChevronUp className="h-4 w-4 ml-1" /></span>
              )}
            </Button>
          )}
        </div>
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
