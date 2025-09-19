'use client';

import { useState } from 'react';
import { GuestPhotoModal } from './guest-photo-modal';
import type { Photo } from '@/lib/db/schema';
import { GuestPhotoCard } from './guest-photo-card';

interface GuestPhoto extends Photo {
  uploadedByUser?: { id: number; name?: string | null; email?: string | null } | null;
}

interface GuestPhotoGridProps {
  photos: GuestPhoto[];
  accessCode?: string;
  className?: string;
}

export function GuestPhotoGrid({ 
  photos, 
  accessCode, 
  className = ''
}: GuestPhotoGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handlePhotoClick = (photo: GuestPhoto, index: number) => {
    setSelectedIndex(index);
  };

  if (photos.length === 0) {
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
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map((photo, index) => (
            <GuestPhotoCard
              key={photo.id}
              photo={photo}
              index={index}
              accessCode={accessCode}
              onPhotoClick={handlePhotoClick}
              priority={index < 10} // Prioritize first 10 images
            />
          ))}
        </div>
      </div>

      {/* Photo Modal */}
      {selectedIndex !== null && (
        <GuestPhotoModal
          photos={photos}
          currentIndex={selectedIndex}
          accessCode={accessCode}
          onClose={() => setSelectedIndex(null)}
          onNavigate={setSelectedIndex}
        />
      )}
    </>
  );
}