'use client';

import { useState } from 'react';
import { GuestPhotoModal } from './guest-photo-modal';
import type { Photo } from '@/lib/db/schema';
import { GuestPhotoCard } from './guest-photo-card';
import { Button } from '@/components/ui/button';
import { BulkDownload } from './bulk-download';
import { toast } from 'sonner';

interface GuestPhoto extends Photo {
  uploadedByUser?: { id: number; name?: string | null; email?: string | null } | null;
}

interface GuestPhotoGridProps {
  photos: GuestPhoto[];
  accessCode?: string;
  className?: string;
  eventId?: number;
  enablePagination?: boolean;
  initialHasMore?: boolean;
  initialNextBeforeId?: number | null;
}

export function GuestPhotoGrid({ 
  photos, 
  accessCode, 
  className = '',
  eventId,
  enablePagination = false,
  initialHasMore = false,
  initialNextBeforeId = null,
}: GuestPhotoGridProps) {
  const [items, setItems] = useState<GuestPhoto[]>(photos);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(initialNextBeforeId);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<GuestPhoto[]>([]);

  const handlePhotoClick = (photo: GuestPhoto, index: number) => {
    if (isSelectMode) {
      toggleSelection(photo);
    } else {
      setSelectedIndex(index);
    }
  };

  const toggleSelection = (photo: GuestPhoto) => {
    setSelectedPhotos(prev => {
      const isSelected = prev.some(p => p.id === photo.id);
      if (isSelected) {
        return prev.filter(p => p.id !== photo.id);
      } else {
        if (prev.length >= 10) {
          toast.warning('You can select a maximum of 10 photos for bulk download.');
          return prev;
        }
        return [...prev, photo];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPhotos.length === items.length) {
      setSelectedPhotos([]);
    } else {
      setSelectedPhotos(items.slice(0, 10));
      if (items.length > 10) {
        toast.warning('Selected the first 10 photos. You can select a maximum of 10.');
      }
    }
  };

  async function loadMore() {
    if (!enablePagination || !eventId || !hasMore || !nextBeforeId || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const url = new URL(`/api/events/${eventId}`, window.location.origin);
      url.searchParams.set('limit', '120');
      url.searchParams.set('beforeId', String(nextBeforeId));
      url.searchParams.set('approvedOnly', '1');
      // Private events: pass code if provided
      if (accessCode) url.searchParams.set('code', accessCode);
      const res = await fetch(url.toString(), {
        headers: accessCode ? { 'x-access-code': accessCode } : {},
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load more photos');
      const json = await res.json();
      const newPhotos: GuestPhoto[] = Array.isArray(json?.photos) ? json.photos : [];
      const page = json?.page || {};
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const p of newPhotos) if (p?.id && !seen.has(p.id)) merged.push(p);
        return merged;
      });
      setHasMore(!!page.hasMore);
      setNextBeforeId(page.nextBeforeId ?? null);
    } catch (e) {
      toast.error('Could not load more photos.');
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
        <p className="text-sm text-gray-500">Photos will appear here once uploaded</p>
      </div>
    );
  }

  return (
    <>
      <div className={className}>
        {/* Controls */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-gray-600">
            {isSelectMode
              ? `${selectedPhotos.length} selected`
              : `${items.length} photo${items.length !== 1 ? 's' : ''}`}
          </div>
          <div className="flex items-center gap-2">
            {isSelectMode && (
              <>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedPhotos.length === items.length ? 'Deselect All' : 'Select All'}
                </Button>
                <BulkDownload photos={selectedPhotos} accessCode={accessCode} />
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedPhotos([]);
              }}
            >
              {isSelectMode ? 'Cancel' : 'Select'}
            </Button>
          </div>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {items.map((photo, index) => (
            <GuestPhotoCard
              key={photo.id}
              photo={photo}
              index={index}
              accessCode={accessCode}
              onPhotoClick={handlePhotoClick}
              priority={index < 8} // Prioritize the first 8 images to avoid overloading
              isSelected={selectedPhotos.some(p => p.id === photo.id)}
              isSelectMode={isSelectMode}
            />
          ))}
        </div>

        {enablePagination && hasMore && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
              {isLoadingMore ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedIndex !== null && !isSelectMode && (
        <GuestPhotoModal
          photos={items}
          currentIndex={selectedIndex}
          accessCode={accessCode}
          onClose={() => setSelectedIndex(null)}
          onNavigate={setSelectedIndex}
        />
      )}
    </>
  );
}