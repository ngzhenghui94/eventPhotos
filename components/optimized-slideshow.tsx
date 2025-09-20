'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { OptimizedImage } from './optimized-image';
import { Button } from '@/components/ui/button';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';

interface SlideshowPhoto {
  id: number;
  name?: string;
}

interface OptimizedSlideshowProps {
  photos: SlideshowPhoto[];
  accessCode?: string;
  height?: number;
  intervalMs?: number;
  autoPlay?: boolean;
  showControls?: boolean;
  className?: string;
}

export function OptimizedSlideshow({
  photos,
  accessCode,
  height = 360,
  intervalMs = 4000,
  autoPlay = true,
  showControls = true,
  className = ''
}: OptimizedSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoaded, setIsLoaded] = useState(false);

  // Memoize current photo
  const currentPhoto = useMemo(() => photos[currentIndex], [photos, currentIndex]);

  // Navigation functions
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying || photos.length <= 1) return;

    const interval = setInterval(goToNext, intervalMs);
    return () => clearInterval(interval);
  }, [isPlaying, photos.length, intervalMs, goToNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, isPlaying]);

  if (photos.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <p className="text-gray-500">No photos to display</p>
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden rounded-lg bg-gray-900 ${className}`}
      style={{ height }}
    >
      {/* Main Image */}
      <div className="relative w-full h-full">
        <OptimizedImage
          photoId={currentPhoto.id}
          accessCode={accessCode}
          alt={currentPhoto.name || `Photo ${currentPhoto.id}`}
          className="w-full h-full object-cover"
          priority={true}
          onLoad={() => setIsLoaded(true)}
        />

        {/* Loading overlay */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && photos.length > 1 && (
        <>
          {/* Navigation Arrows */}
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div className="flex items-center gap-4 bg-black/50 rounded-lg px-3 py-2">
              {/* Play/Pause Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white hover:bg-white/20 p-1"
              >
                {isPlaying ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>

              {/* Slide Indicators */}
              <div className="flex gap-1 overflow-x-auto max-w-xs" style={{ scrollbarWidth: 'none' }}>
                {photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all flex-shrink-0 ${
                      index === currentIndex 
                        ? 'bg-white' 
                        : 'bg-white/50 hover:bg-white/70'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              {/* Counter */}
              <div className="text-white text-xs w-16 text-center">
                {currentIndex + 1} / {photos.length}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Progress Bar */}
      {isPlaying && photos.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
          <div 
            className="h-full bg-white transition-all linear"
            style={{
              width: `${((currentIndex + 1) / photos.length) * 100}%`,
              transition: `width ${intervalMs}ms linear`
            }}
          />
        </div>
      )}

      {/* Preload upcoming images */}
      <div className="hidden">
    {photos.slice(currentIndex + 1, currentIndex + 3).map((photo) => (
          <OptimizedImage
            key={`preload-${photo.id}`}
            photoId={photo.id}
            accessCode={accessCode}
            alt=""
      className="w-1 h-1"
      // Force eager load offscreen so navigation swaps to full image ASAP
      priority={true}
          />
        ))}
      </div>
    </div>
  );
}