'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from './optimized-image';
import { X, ArrowLeft, ArrowRight, Download } from 'lucide-react';
import type { Photo } from '@/lib/db/schema';

interface GuestPhoto extends Photo {
  uploadedByUser?: { id: number; name?: string | null; email?: string | null } | null;
}

interface GuestPhotoModalProps {
  photos: GuestPhoto[];
  currentIndex: number;
  accessCode?: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function GuestPhotoModal({
  photos,
  currentIndex,
  accessCode,
  onClose,
  onNavigate
}: GuestPhotoModalProps) {
  const photo = photos[currentIndex];
  
  if (!photo) {
    onClose();
    return null;
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
        e.preventDefault();
        onNavigate(currentIndex + 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, photos.length, onNavigate, onClose]);

  const codeQuery = accessCode ? `?code=${encodeURIComponent(accessCode)}` : '';
  const downloadUrl = `/api/photos/${photo.id}/download${codeQuery}`;
  const uploadedBy = photo.uploadedByUser?.name || photo.guestName || 'Guest';
  const uploadDate = new Date(photo.uploadedAt).toLocaleDateString();

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 text-white">
          <div>
            <h3 className="text-lg font-medium">
              {photo.originalFilename || `Photo ${photo.id}`}
            </h3>
            <p className="text-sm text-gray-300">
              By {uploadedBy} • {uploadDate}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white hover:bg-white/20"
            >
              <a href={downloadUrl} download={photo.originalFilename}>
                <Download className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(currentIndex - 1);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white z-10"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
        )}

        {currentIndex < photos.length - 1 && (
          <Button
            variant="ghost"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(currentIndex + 1);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white z-10"
          >
            <ArrowRight className="h-6 w-6" />
          </Button>
        )}

        {/* Image */}
        <div 
          className="flex-1 flex items-center justify-center p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <OptimizedImage
            photoId={photo.id}
            accessCode={accessCode}
            alt={photo.originalFilename || `Photo ${photo.id}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            priority={true}
          />
        </div>

        {/* Photo counter */}
        <div className="text-center pb-4">
          <span className="text-white/80 text-sm">
            {currentIndex + 1} of {photos.length}
          </span>
        </div>
      </div>
    </div>
  );
}