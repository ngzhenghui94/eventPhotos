"use client";
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
type TimelineProps = { items: any[]; storageKey?: string };

export function Timeline({ items, storageKey }: TimelineProps) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      if (!storageKey) return;
      const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
      if (saved === '1') setCollapsed(true);
    } catch {}
  }, [storageKey]);

  if (!items?.length) return (
    <div className="rounded-xl border border-gray-200 bg-white px-6 py-6 text-center text-gray-400 italic">No timeline entries yet.</div>
  );
  // Find the closest timeline entry to now
  const now = new Date();
  let closestIdx = -1;
  let minDiff = Infinity;
  items.forEach((item, idx) => {
    const diff = Math.abs(new Date(item.time).getTime() - now.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = idx;
    }
  });
  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-orange-50 shadow-sm px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 rounded-full p-2"><Calendar className="w-6 h-6 text-blue-600" /></span>
          <span className="font-bold text-2xl text-blue-900">Event Timeline</span>
        </div>
        <button
          type="button"
          className="inline-flex items-center text-sm text-blue-800 hover:text-blue-900"
          aria-expanded={!collapsed}
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
      {!collapsed && (
      <ol className="relative border-l-2 border-blue-200 pl-6">
        {items.map((item, idx) => {
          const isClosest = idx === closestIdx;
          // Determine pill label
          let pillLabel = '';
          if (isClosest) {
            const itemTime = new Date(item.time);
            if (itemTime.getTime() > now.getTime()) {
              pillLabel = 'Upcoming';
            } else {
              pillLabel = 'Ongoing';
            }
          }
          return (
            <li key={item.id} className={`mb-8 ml-4 transition-all duration-300 ${isClosest ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-l-4 border-yellow-400 shadow-lg scale-[1.03]' : ''}`}>
              <div className={`absolute -left-2.5 mt-1 w-5 h-5 ${isClosest ? 'bg-yellow-300 border-yellow-500' : 'bg-blue-100 border-blue-300'} border-2 rounded-full flex items-center justify-center`}>
                <Calendar className={`w-3 h-3 ${isClosest ? 'text-yellow-700' : 'text-blue-600'}`} />
              </div>
              <div className={`bg-white rounded-lg shadow p-4 ${isClosest ? 'border-2 border-yellow-400' : ''}`}>
                {/* Highlight only the card, do not change text/font styles */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-lg text-blue-800">{item.title}</span>
                  {item.location && <span className="ml-2 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">{item.location}</span>}
                  {isClosest && pillLabel && (
                    <span className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${pillLabel === 'Upcoming' ? 'bg-yellow-200 text-yellow-900' : 'bg-orange-200 text-orange-900'}`}>{pillLabel}</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-1">{
                  (() => {
                    const d = new Date(item.time);
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    const day = pad(d.getDate());
                    const month = pad(d.getMonth() + 1);
                    const year = d.getFullYear();
                    const hours = pad(d.getHours());
                    const mins = pad(d.getMinutes());
                    return `${day}/${month}/${year} ${hours}:${mins}`;
                  })()
                }</div>
                {item.description && <div className="text-gray-700 text-base mb-1">{item.description}</div>}
              </div>
            </li>
          );
        })}
      </ol>
      )}
    </div>
  );
}
