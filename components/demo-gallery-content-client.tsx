"use client";
import { useState, useMemo, useRef } from 'react';
import type { DemoEvent, DemoPhoto } from '@/types/demo';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Upload, Download, X, Camera, ArrowLeft, Link as LinkIcon, Copy, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { EventQr } from '@/components/event-qr';
import { brand } from '@/lib/brand';

interface DemoGalleryContentClientProps {
  demo: DemoEvent;
  initialPhotos: DemoPhoto[];
  totalPhotos: number;
}

export function DemoGalleryContentClient({ demo, initialPhotos, totalPhotos }: DemoGalleryContentClientProps) {
  // Debug log to diagnose empty page
  console.log('DemoGalleryContentClient props:', { demo, initialPhotos, totalPhotos });
  const safeInitialPhotos = Array.isArray(initialPhotos) ? initialPhotos : [];
  const [photos, setPhotos] = useState<DemoPhoto[]>(safeInitialPhotos);
  const [offset, setOffset] = useState<number>(safeInitialPhotos.length);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<DemoPhoto | null>(null);

  // Lazy load more photos
  const loadMore = async () => {
    setLoadingMore(true);
    const res = await fetch(`/api/events/${demo.id}?limit=20&offset=${offset}`);
    const data: { photos: DemoPhoto[] } = await res.json();
    setPhotos((prev: DemoPhoto[]) => [...prev, ...(data.photos || [])]);
    setOffset((prev: number) => prev + (data.photos?.length || 0));
    setLoadingMore(false);
  };

  // ...existing rendering logic, modals, uploads, etc...
  // For brevity, only the photo grid and load more button are shown here

  return (
    <div>
      {/* Photo Grid or Empty State */}
      {photos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No photos found for this event.</p>
          <p className="mt-2 text-xs">Check API response and eventId. Demo eventId: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{demo?.id?.toString() || 'undefined'}</span></p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map((photo: DemoPhoto) => (
            <Card key={photo.id} className="group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden rounded-xl bg-white/80 ring-1 ring-slate-200/60 backdrop-blur-md" onClick={() => setSelectedPhoto(photo)}>
              <CardContent className="p-0">
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={`/api/photos/${photo.id}/thumb`}
                    alt={photo.originalFilename || photo.filename || 'Event photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.dataset.fallback) {
                        img.dataset.fallback = '1';
                        img.src = `/api/photos/${photo.id}`;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-opacity duration-300" />
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="backdrop-blur bg-black/60 text-white text-xs px-2 py-1 rounded truncate">{photo.guestName || photo.uploadedByUser?.name || ''}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Load More Button */}
      {offset < totalPhotos && photos.length > 0 && (
        <div className="flex justify-center mt-6">
          <Button onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load More Photos'}
          </Button>
        </div>
      )}
    </div>
  );
}
