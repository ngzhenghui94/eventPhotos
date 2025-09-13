"use client";
import { Calendar, ChevronDown, ChevronUp, PlusCircle, MinusCircle, MapPin, Clock } from 'lucide-react';
import { useEffect, useState, useId } from 'react';
import { Button } from './ui/button';
type TimelineProps = { items: any[]; storageKey?: string; canAdjust?: boolean; eventId?: number };

export function Timeline({ items, storageKey, canAdjust, eventId }: TimelineProps) {
  const [collapsed, setCollapsed] = useState(false);
  const contentId = useId();
  const [adjusting, setAdjusting] = useState<null | 'delay' | 'forward'>(null);
  const [adjustingItemId, setAdjustingItemId] = useState<number | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    try {
      if (!storageKey) return;
      const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
      if (saved === '1') setCollapsed(true);
    } catch {}
  }, [storageKey]);
  useEffect(() => { setIsClient(true); }, []);

  if (!items?.length) return (
    <div className="rounded-xl border border-gray-200 bg-white px-6 py-6 text-center text-gray-400 italic">No timeline entries yet.</div>
  );
  // Compute closest, last past and next future; tick every 30s for live labels
  const now = new Date();
  const [nowTick, setNowTick] = useState<number>(now.getTime());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  let closestIdx = -1;
  let minDiff = Infinity;
  let lastPastIdx = -1;
  let lastPastTs = -Infinity;
  let nextFutureIdx = -1;
  let nextFutureTs = Infinity;
  items.forEach((item, idx) => {
    const ts = new Date(item.time).getTime();
    const diff = Math.abs(ts - nowTick);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = idx;
    }
    if (ts <= nowTick && ts > lastPastTs) {
      lastPastTs = ts;
      lastPastIdx = idx;
    }
    if (ts > nowTick && ts < nextFutureTs) {
      nextFutureTs = ts;
      nextFutureIdx = idx;
    }
  });
  function formatDuration(ms: number) {
    ms = Math.max(0, ms);
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-orange-50 shadow-sm px-6 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 rounded-full p-2"><Calendar className="w-6 h-6 text-blue-600" /></span>
          <span role="heading" aria-level={2} className="font-bold text-2xl text-blue-900">Event Timeline</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {canAdjust && items.length > 0 && eventId && (
            <>
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="px-2 text-xs border-red-200 text-red-800 bg-red-50 hover:bg-red-100 w-full sm:w-auto justify-center"
                onClick={async () => {
                  setAdjustError(null);
                  setAdjusting('delay');
                  try {
                    const res = await fetch('/api/timeline/adjust-all', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ eventId, deltaMinutes: 15 }),
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result?.error || 'Failed to adjust');
                    if (typeof window !== 'undefined') window.location.reload();
                  } catch (e: any) {
                    setAdjustError(e?.message || 'Failed to adjust');
                  } finally {
                    setAdjusting(null);
                  }
                }}
                disabled={adjusting !== null}
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                {adjusting === 'delay' ? 'Delaying…' : 'Delay 15m'}
              </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="px-2 text-xs border-green-200 text-green-800 bg-green-50 hover:bg-green-100 w-full sm:w-auto justify-center"
                onClick={async () => {
                  setAdjustError(null);
                  setAdjusting('forward');
                  try {
                    const res = await fetch('/api/timeline/adjust-all', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ eventId, deltaMinutes: -15 }),
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result?.error || 'Failed to adjust');
                    if (typeof window !== 'undefined') window.location.reload();
                  } catch (e: any) {
                    setAdjustError(e?.message || 'Failed to adjust');
                  } finally {
                    setAdjusting(null);
                  }
                }}
                disabled={adjusting !== null}
              >
                <MinusCircle className="h-3.5 w-3.5 mr-1" />
                {adjusting === 'forward' ? 'Advancing…' : 'Bring forward 15m'}
              </Button>
            </>
          )}
          <button
            type="button"
            className="inline-flex items-center text-sm text-blue-800 hover:text-blue-900 w-full sm:w-auto justify-center"
            aria-expanded={!collapsed}
            aria-controls={contentId}
            onClick={() => {
              setCollapsed((c) => {
                const next = !c;
                try { if (storageKey) localStorage.setItem(storageKey, next ? '1' : '0'); } catch {}
                return next;
              });
            }}
          >
            {collapsed ? (<><ChevronDown className="h-4 w-4 mr-1"/> Expand</>) : (<><ChevronUp className="h-4 w-4 mr-1"/> Minimize</>)}
          </button>
        </div>
      </div>
      {adjustError && (
        <div className="mb-2 text-red-600 text-sm" role="status" aria-live="polite">{adjustError}</div>
      )}
      {!collapsed && (
      <ol id={contentId} className="relative border-l-2 border-blue-200 pl-6">
        {items.map((item, idx) => {
          const isClosest = idx === closestIdx;
          const itemTs = new Date(item.time).getTime();
          const isPastOrNow = itemTs <= nowTick;
          const isFuture = itemTs > nowTick;
          const showOngoing = isPastOrNow && lastPastIdx === idx;
          const showUpcoming = isFuture && nextFutureIdx === idx;
          return (
            <li key={item.id} className={`mb-8 ml-4 transition-all duration-300 ${isClosest ? '' : ''}`} aria-current={isClosest ? 'true' : undefined} tabIndex={isClosest ? 0 : -1}>
              <div className={`absolute -left-2.5 mt-1 w-5 h-5 ${isClosest ? 'bg-yellow-300 border-yellow-500' : 'bg-blue-100 border-blue-300'} border-2 rounded-full flex items-center justify-center`}>
                <Calendar className={`w-3 h-3 ${isClosest ? 'text-yellow-700' : 'text-blue-600'}`} />
              </div>
              <div className={`bg-white rounded-lg p-4 ${isClosest ? 'ring-2 ring-yellow-300/50 ring-offset-2 ring-offset-white shadow-[0_0_10px_rgba(234,179,8,0.15)]' : 'shadow'}`}>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-lg text-blue-800">{item.title}</span>
                  {item.location && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                      <MapPin className="w-3 h-3 text-blue-600" />
                      {item.location}
                    </span>
                  )}
                  {item.id && (
                    <a href={`/api/timeline/${item.id}/ics`} className="ml-1 inline-flex items-center px-2 py-0.5 rounded border border-amber-300 bg-white text-amber-800 text-[11px] hover:bg-amber-50">Add to calendar</a>
                  )}
                  {showOngoing && (
                    <span className="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-200 text-orange-900">
                      {`Ongoing${isClient ? ` • ${formatDuration(nowTick - itemTs)} elapsed` : ''}`}
                    </span>
                  )}
                  {showUpcoming && (
                    <span className="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-200 text-yellow-900">
                      {`Upcoming${isClient ? ` • in ${formatDuration(itemTs - nowTick)}` : ''}`}
                    </span>
                  )}
                </div>
                <div className="mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-gray-700 text-xs border border-gray-200">
                    <Clock className="w-3 h-3" />
                    <time dateTime={new Date(item.time).toISOString()}>
                      {(() => {
                        const d = new Date(item.time);
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        const day = pad(d.getDate());
                        const month = pad(d.getMonth() + 1);
                        const year = d.getFullYear();
                        const hours = pad(d.getHours());
                        const mins = pad(d.getMinutes());
                        return `${day}/${month}/${year} ${hours}:${mins}`;
                      })()}
                    </time>
                  </span>
                </div>
                {canAdjust && item.id && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="px-2 text-xs border-red-200 text-red-800 bg-red-50 hover:bg-red-100 w-full sm:w-auto justify-center"
                      onClick={async () => {
                        setAdjustError(null);
                        setAdjusting('delay');
                        setAdjustingItemId(item.id);
                        try {
                          const res = await fetch('/api/timeline/adjust', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: item.id, deltaMinutes: 15 }),
                          });
                          const result = await res.json();
                          if (!res.ok) throw new Error(result?.error || 'Failed to adjust');
                          if (typeof window !== 'undefined') window.location.reload();
                        } catch (e: any) {
                          setAdjustError(e?.message || 'Failed to adjust');
                        } finally {
                          setAdjusting(null);
                          setAdjustingItemId(null);
                        }
                      }}
                      disabled={adjustingItemId === item.id}
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-1" />
                      {adjusting === 'delay' && adjustingItemId === item.id ? 'Delaying…' : 'Delay 15m'}
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="px-2 text-xs border-green-200 text-green-800 bg-green-50 hover:bg-green-100 w-full sm:w-auto justify-center"
                      onClick={async () => {
                        setAdjustError(null);
                        setAdjusting('forward');
                        setAdjustingItemId(item.id);
                        try {
                          const res = await fetch('/api/timeline/adjust', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: item.id, deltaMinutes: -15 }),
                          });
                          const result = await res.json();
                          if (!res.ok) throw new Error(result?.error || 'Failed to adjust');
                          if (typeof window !== 'undefined') window.location.reload();
                        } catch (e: any) {
                          setAdjustError(e?.message || 'Failed to adjust');
                        } finally {
                          setAdjusting(null);
                          setAdjustingItemId(null);
                        }
                      }}
                      disabled={adjustingItemId === item.id}
                    >
                      <MinusCircle className="h-3.5 w-3.5 mr-1" />
                      {adjusting === 'forward' && adjustingItemId === item.id ? 'Advancing…' : 'Bring forward 15m'}
                    </Button>
                  </div>
                )}
                {item.description && (
                  <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      )}
    </div>
  );
}
