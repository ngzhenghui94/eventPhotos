'use client';

import { OptimizedImage } from './optimized-image';
import type { Photo } from '@/lib/db/schema';

interface GuestPhoto extends Photo {
  uploadedByUser?: { id: number; name?: string | null; email?: string | null } | null;
}

interface GuestPhotoCardProps {
  photo: GuestPhoto;
  index: number;
  accessCode?: string;
  onPhotoClick: (photo: GuestPhoto, index: number) => void;
  priority?: boolean;
}

export function GuestPhotoCard({ 
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
          thumbOnly={true}
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
