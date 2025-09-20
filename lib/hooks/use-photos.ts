'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { trackNetworkRequest } from '@/lib/utils/frontend-performance';
import type { Photo } from '@/lib/db/schema';

// Enhanced photo data with loading states
export interface PhotoWithMeta extends Photo {
  uploadedByUser?: { id: number; name?: string | null; email?: string | null } | null;
  thumbnailLoaded?: boolean;
  fullImageLoaded?: boolean;
  error?: string;
}

export interface UsePhotosOptions {
  eventId: number;
  accessCode?: string;
  enableCache?: boolean;
  staleTime?: number; // ms
  retryAttempts?: number;
  filterApproved?: boolean;
}

export interface UsePhotosReturn {
  photos: PhotoWithMeta[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  updatePhotoMeta: (photoId: number, meta: Partial<PhotoWithMeta>) => void;
}

// Simple in-memory cache for photo data
const photoCache = new Map<string, { data: PhotoWithMeta[]; timestamp: number; eventData?: any }>();
const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export function usePhotos(options: UsePhotosOptions): UsePhotosReturn {
  const {
    eventId,
    accessCode,
    enableCache = true,
    staleTime = DEFAULT_CACHE_TIME,
    retryAttempts = 3,
    filterApproved = false
  } = options;

  const [photos, setPhotos] = useState<PhotoWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const cacheKey = useMemo(() => 
    `photos-${eventId}-${accessCode || 'public'}-${filterApproved ? 'approved' : 'all'}`,
    [eventId, accessCode, filterApproved]
  );

  const fetchPhotos = useCallback(async (attempt = 1): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      if (enableCache) {
        const cached = photoCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < staleTime) {
          setPhotos(cached.data);
          setLoading(false);
          return;
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const url = new URL(`/api/events/${eventId}`, window.location.origin);
      if (accessCode) {
        url.searchParams.set('code', accessCode);
      }

      // Track network request performance
      const networkTracker = trackNetworkRequest(url.toString(), 'GET');

      const response = await fetch(url.toString(), {
        cache: 'no-store',
        signal: controller.signal,
        headers: accessCode ? { 'x-access-code': accessCode } : {}
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        networkTracker.onError(response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      networkTracker.onSuccess(response.status);

      const data = await response.json();
      let photosData: PhotoWithMeta[] = data.photos || [];

      if (filterApproved) {
        photosData = photosData.filter(p => p.isApproved);
      }

      // Initialize loading states
      photosData = photosData.map(photo => ({
        ...photo,
        thumbnailLoaded: false,
        fullImageLoaded: false
      }));

      setPhotos(photosData);
      
      // Cache the results
      if (enableCache) {
        photoCache.set(cacheKey, {
          data: photosData,
          timestamp: Date.now(),
          eventData: data.event
        });
      }

      setHasMore(false); // TODO: Implement pagination
    } catch (err) {
      console.error('Error fetching photos:', err);
      
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else if (attempt < retryAttempts) {
        // Exponential backoff retry
        setTimeout(() => fetchPhotos(attempt + 1), Math.pow(2, attempt) * 1000);
        return;
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch photos');
      }
    } finally {
      setLoading(false);
    }
  }, [eventId, accessCode, cacheKey, enableCache, staleTime, retryAttempts, filterApproved]);

  const updatePhotoMeta = useCallback((photoId: number, meta: Partial<PhotoWithMeta>) => {
    setPhotos(prevPhotos => 
      prevPhotos.map(photo => 
        photo.id === photoId ? { ...photo, ...meta } : photo
      )
    );
  }, []);

  const loadMore = useCallback(async () => {
    // TODO: Implement pagination
    console.log('Pagination not yet implemented');
  }, []);

  const refetch = useCallback(async () => {
    // Clear cache and refetch
    photoCache.delete(cacheKey);
    await fetchPhotos();
  }, [cacheKey, fetchPhotos]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  return {
    photos,
    loading,
    error,
    refetch,
    hasMore,
    loadMore,
    updatePhotoMeta
  };
}

// Hook for individual photo loading state
export function usePhotoLoader(photoId: number, accessCode?: string) {
  // Module-level caches so remounts don't lose loaded state
  // Keyed by photoId + accessCode to avoid mixing access contexts
  // Note: kept inside function body via closure over module singletons below
  const cacheKey = `${photoId}:${accessCode || 'public'}`;

  const [thumbnailLoaded, setThumbnailLoaded] = useState(() => thumbLoadedCache.has(cacheKey));
  const [fullImageLoaded, setFullImageLoaded] = useState(() => fullLoadedCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const codeQuery = accessCode ? `?code=${encodeURIComponent(accessCode)}` : '';
  const thumbnailSrc = `/api/photos/${photoId}/thumb${codeQuery}`;
  const fullSrc = `/api/photos/${photoId}${codeQuery}`;

  const preloadThumbnail = useCallback(() => {
    // Short-circuit if we already know it's loaded (from cache or state)
    if (thumbLoadedCache.has(cacheKey) || thumbnailLoaded) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        thumbLoadedCache.set(cacheKey, true);
        setThumbnailLoaded(true);
        resolve();
      };
      img.onerror = () => {
        setError('Failed to load thumbnail');
        reject(new Error('Failed to load thumbnail'));
      };
      img.src = thumbnailSrc;
    });
  }, [thumbnailSrc, thumbnailLoaded, cacheKey]);

  const preloadFullImage = useCallback(() => {
    if (fullLoadedCache.has(cacheKey) || fullImageLoaded) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        fullLoadedCache.set(cacheKey, true);
        setFullImageLoaded(true);
        resolve();
      };
      img.onerror = () => {
        setError('Failed to load full image');
        reject(new Error('Failed to load full image'));
      };
      img.src = fullSrc;
    });
  }, [fullSrc, fullImageLoaded, cacheKey]);

  return {
    thumbnailSrc,
    fullSrc,
    thumbnailLoaded,
    fullImageLoaded,
    error,
    preloadThumbnail,
    preloadFullImage
  };
}

// Module-level caches (declared at end of module to avoid hoist confusion in edits)
const thumbLoadedCache: Map<string, true> = new Map();
const fullLoadedCache: Map<string, true> = new Map();