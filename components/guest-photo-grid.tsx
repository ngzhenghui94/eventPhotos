'use client';

import { useState } from 'react';
import { OptimizedImage } from './optimized-image';
import { VirtualizedPhotoGrid } from './virtualized-photo-grid';
import { GuestPhotoModal } from './guest-photo-modal';
import { Button } from '@/components/ui/button';
import type { Photo } from '@/lib/db/schema';

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
  const [useVirtualized, setUseVirtualized] = useState(photos.length > 50);
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
          {photos.length > 50 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUseVirtualized(!useVirtualized)}
            >
              {useVirtualized ? 'Standard Grid' : 'Virtual Grid'}
            </Button>
          )}
        </div>

        {/* Photo Grid */}
        {useVirtualized ? (
          <VirtualizedPhotoGrid
            photos={photos}
            onPhotoClick={handlePhotoClick}
            accessCode={accessCode}
            className="h-96 border rounded-lg"
            itemsPerRow={4}
            itemHeight={280}
          />
        ) : (
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
        )}
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

interface GuestPhotoCardProps {
  photo: GuestPhoto;
  index: number;
  accessCode?: string;
  onPhotoClick: (photo: GuestPhoto, index: number) => void;
  priority?: boolean;
}

function GuestPhotoCard({ 
  photo, 
  index, 
  accessCode, 
  onPhotoClick,
  priority = false 
}: GuestPhotoCardProps) {
  const handleClick = () => {
    onPhotoClick(photo, index);
  };
  
  const uploadedBy = photo.uploadedByUser?.name || photo.guestName || 'Guest';
  const uploadDate = new Date(photo.uploadedAt).toLocaleDateString();

  return (
    <div 
      className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer"
      onClick={handleClick}
    >
      <div className="aspect-square relative">
        <OptimizedImage
          photoId={photo.id}
          accessCode={accessCode}
          alt={photo.originalFilename || `Photo ${photo.id}`}
          className="w-full h-full"
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200" />
        
        {/* Hover info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <p className="text-white text-sm font-medium truncate">
            {photo.originalFilename || `Photo ${photo.id}`}
          </p>
          <p className="text-white/80 text-xs">
            By {uploadedBy} • {uploadDate}
          </p>
        </div>
      </div>
    </div>
  );
}