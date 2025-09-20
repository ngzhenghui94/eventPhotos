'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePhotoLoader } from '@/lib/hooks/use-photos';
import { trackImageLoad } from '@/lib/utils/frontend-performance';

interface OptimizedImageProps {
  photoId: number;
  accessCode?: string;
  alt: string;
  className?: string;
  onClick?: (e?: React.MouseEvent) => void;
  priority?: boolean;
  sizes?: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
  placeholder?: 'blur' | 'empty';
  quality?: number;
  // When true, only load and display the thumbnail; never upgrade to full image
  thumbOnly?: boolean;
}

// Create a global concurrency gate to limit concurrent image loads
class ConcurrencyGate {
  private inFlight = 0;
  private queue: Array<() => void> = [];
  
  constructor(private maxConcurrent: number = 6) {}
  
  async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const wrapped = () => {
        this.inFlight++;
        task()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.inFlight--;
            this.processQueue();
          });
      };
      
      if (this.inFlight < this.maxConcurrent) {
        wrapped();
      } else {
        this.queue.push(wrapped);
      }
    });
  }
  
  private processQueue() {
    if (this.queue.length > 0 && this.inFlight < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

const imageGate = new ConcurrencyGate(6);

// Generate blur placeholder that is identical on server and client to avoid hydration mismatches
function generateBlurDataURL(width: number = 10, height: number = 10): string {
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>` +
      `<defs>` +
        `<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
          `<stop offset='0%' stop-color='#f3f4f6'/>` +
          `<stop offset='100%' stop-color='#e5e7eb'/>` +
        `</linearGradient>` +
      `</defs>` +
      `<rect width='100%' height='100%' fill='url(#g)'/>` +
    `</svg>`
  );
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

export function OptimizedImage({
  photoId,
  accessCode,
  alt,
  className = '',
  onClick,
  priority = false,
  sizes,
  onLoad,
  onError,
  placeholder = 'blur',
  quality = 80,
  thumbOnly = false
}: OptimizedImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  
  const {
    thumbnailSrc,
    fullSrc,
    thumbnailLoaded,
    fullImageLoaded,
    error,
    preloadThumbnail,
    preloadFullImage
  } = usePhotoLoader(photoId, accessCode);

  // Blur placeholder data URL
  const blurDataURL = placeholder === 'blur' ? generateBlurDataURL() : '';

  useEffect(() => {
    // Mark mounted to ensure any client-only style transitions don't mismatch SSR
    setMounted(true);
  }, []);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;
    
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px 0px', // Start loading when image is 50px from viewport
        threshold: 0.01
      }
    );

    observer.observe(img);
    return () => observer.disconnect();
  }, [priority, isInView]);

  // Load images progressively when in view
  useEffect(() => {
    if (!isInView) return;

    const loadImage = async () => {
      try {
        // Track thumbnail loading
        const thumbTracker = trackImageLoad(photoId, 'thumbnail');
        
        // First load thumbnail
        await imageGate.execute(async () => {
          try {
            await preloadThumbnail();
            thumbTracker.onLoad();
          } catch (err) {
            thumbTracker.onError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
          }
        });
  // Show thumbnail immediately while full image loads in background
  setCurrentSrc(thumbnailSrc);
  setIsLoaded(true);
        // If we only want thumbs in this context, stop here
        if (thumbOnly) {
          setIsLoaded(true);
          onLoad?.();
          return;
        }
        
        // Track full image loading
        const fullTracker = trackImageLoad(photoId, 'full');
        
        // Then load full image
        await imageGate.execute(async () => {
          try {
            await preloadFullImage();
            fullTracker.onLoad();
          } catch (err) {
            fullTracker.onError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
          }
        });
        setCurrentSrc(fullSrc);
  // Keep loaded state true to avoid flicker; source upgrades seamlessly
  setIsLoaded(true);
        onLoad?.();
      } catch (err) {
        setHasError(true);
        onError?.(err instanceof Error ? err.message : 'Failed to load image');
      }
    };

    loadImage();
  }, [isInView, thumbnailSrc, fullSrc, preloadThumbnail, preloadFullImage, onLoad, onError, photoId, thumbOnly]);

  // Handle loading states
  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback(() => {
    setHasError(true);
    onError?.('Failed to load image');
  }, [onError]);

  // Determine what to show
  // Show placeholder only until the thumbnail is ready
  const shouldShowPlaceholder = !thumbnailLoaded && !hasError && placeholder !== 'empty';
  const shouldShowThumbnail = thumbnailLoaded && !fullImageLoaded && !hasError;
  const shouldShowFullImage = isLoaded && !hasError;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder */}
      {mounted && shouldShowPlaceholder && blurDataURL && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
          style={{
            filter: 'blur(20px)',
            transform: 'scale(1.1)', // Slight scale to hide blur edges
          }}
        />
      )}
      
      {/* Main image */}
      <img
        ref={imgRef}
        // Avoid passing empty string to src; leave it undefined until we have a URL
        src={currentSrc || (priority ? thumbnailSrc : undefined)}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(e) => onClick?.(e)}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading={priority ? 'eager' : 'lazy'}
        sizes={sizes}
        style={{
          minHeight: '100px', // Prevent layout shift
        }}
      />
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className="text-xs">Failed to load</p>
          </div>
        </div>
      )}
      
      {/* Loading spinner for priority images */}
      {priority && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
}

// Skeleton loader component for use while images are loading
export function ImageSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 ${className}`}>
      <div className="flex items-center justify-center h-full">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}